import { v4 as uuidv4 } from 'uuid';
import {
  AccountResult,
  MultiAccountResponse,
  AccountSummary,
  RequestContext,
} from '../types';
import { getRegistry, routeToAccountType } from '../adapters/adapter';
import { getCache } from '../cache';
import { logger } from '../telemetry/logger';
import { traceAsync } from '../telemetry/spans';
import { recordAdapterCall, recordPartialResponse } from '../telemetry/metrics';

const MAX_CONCURRENT_REQUESTS = 50;
const OVERALL_TIMEOUT_MS = 2000;

export interface OrchestratorOptions {
  forceRefresh?: boolean;
  fields?: string[];
  maxConcurrency?: number;
  timeoutMs?: number;
}

export class AccountOrchestrator {
  private registry = getRegistry();
  private cache = getCache();

  async getSingleAccount(
    accountId: string,
    context: RequestContext
  ): Promise<AccountResult> {
    return traceAsync(
      'orchestrator.getSingleAccount',
      {
        'account.id': accountId,
        'request.id': context.requestId || 'unknown',
        'cache.force_refresh': context.forceRefresh || false,
      },
      async (span) => {
        const accountType = routeToAccountType(accountId);
        span.setAttribute('account.type', accountType);

        const adapter = this.registry.getAdapter(accountType);

        if (!adapter) {
          span.setAttribute('orchestrator.result', 'no_adapter');
          return {
            accountId,
            status: 'not_found',
            error: {
              code: 'no_adapter',
              message: `No adapter found for account type: ${accountType}`,
            },
          };
        }

        span.setAttribute('adapter.backend', adapter.backendName);

        // Try cache first unless force refresh
        if (!context.forceRefresh) {
          const cached = await this.cache.get(accountId);
          if (cached && !cached.stale) {
            span.setAttribute('cache.hit', true);
            span.setAttribute('cache.fresh', true);
            span.setAttribute('orchestrator.result', 'cache_hit');

            logger.debug('Cache hit (fresh)', { accountId, requestId: context.requestId });
            return {
              accountId,
              status: 'ok',
              data: cached,
              latencyMs: 5, // Minimal cache lookup time
            };
          } else if (cached) {
            span.setAttribute('cache.hit', true);
            span.setAttribute('cache.fresh', false);
          } else {
            span.setAttribute('cache.hit', false);
          }
        } else {
          span.setAttribute('cache.checked', false);
        }

        // Call adapter
        const adapterResult = await adapter.getSummary(accountId, {
          fields: context.forceRefresh ? undefined : [],
        });

        // Record adapter metrics
        recordAdapterCall(
          adapter.backendName,
          adapterResult.success,
          adapterResult.latencyMs || 0
        );

        if (adapterResult.success && adapterResult.raw) {
          const canonical = adapterResult.raw as AccountSummary;
          await this.cache.set(accountId, canonical);

          span.setAttribute('orchestrator.result', 'adapter_success');
          span.setAttribute('orchestrator.latency_ms', adapterResult.latencyMs || 0);

          return {
            accountId,
            status: 'ok',
            data: canonical,
            latencyMs: adapterResult.latencyMs,
          };
        } else {
          // Adapter failed - try to return stale cache
          const staleData = await this.cache.get(accountId);
          if (staleData) {
            staleData.stale = true;
            span.setAttribute('orchestrator.result', 'stale_fallback');
            span.setAttribute('orchestrator.latency_ms', adapterResult.latencyMs || 0);

            logger.info('Returning stale cache due to adapter failure', {
              accountId,
              requestId: context.requestId,
            });

            return {
              accountId,
              status: 'unavailable',
              data: staleData,
              error: adapterResult.error,
              latencyMs: adapterResult.latencyMs,
            };
          }

          span.setAttribute('orchestrator.result', 'adapter_failure');
          span.setAttribute('orchestrator.latency_ms', adapterResult.latencyMs || 0);

          return {
            accountId,
            status: 'unavailable',
            error: adapterResult.error,
            latencyMs: adapterResult.latencyMs,
          };
        }
      }
    );
  }

  async getMultipleAccounts(
    accountIds: string[],
    context: RequestContext,
    options: OrchestratorOptions = {}
  ): Promise<MultiAccountResponse> {
    return traceAsync(
      'orchestrator.getMultipleAccounts',
      {
        'accounts.count': accountIds.length,
        'request.id': context.requestId || 'unknown',
        'orchestrator.timeout_ms': options.timeoutMs || OVERALL_TIMEOUT_MS,
        'orchestrator.max_concurrency': options.maxConcurrency || MAX_CONCURRENT_REQUESTS,
      },
      async (span) => {
        const requestId = context.requestId || uuidv4();
        const timeoutMs = options.timeoutMs || OVERALL_TIMEOUT_MS;

        logger.info('Multi-account request started', {
          requestId,
          accountCount: accountIds.length,
        });

        // Create timeout for overall request
        const overallTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Overall timeout')), timeoutMs);
        });

        // Fan-out to all accounts
        const resultsPromise = this.fanOut(accountIds, context, options);

        let results: AccountResult[];
        let timedOut = false;

        try {
          results = await Promise.race([resultsPromise, overallTimeoutPromise]);
        } catch (err) {
          timedOut = true;
          span.setAttribute('orchestrator.timed_out', true);
          // Get whatever results we have so far (partial results)
          results = await resultsPromise.catch(() => []);
        }

        // Determine overall status
        const overallStatus = this.determineOverallStatus(results, timedOut);

        // Record partial response metric if applicable
        if (overallStatus === 'partial') {
          recordPartialResponse();
        }

        // Add result attributes to span
        span.setAttribute('orchestrator.overall_status', overallStatus);
        span.setAttribute('orchestrator.results_count', results.length);
        span.setAttribute('orchestrator.success_count', results.filter((r) => r.status === 'ok').length);
        span.setAttribute('orchestrator.error_count', results.filter((r) => r.status === 'unavailable').length);
        span.setAttribute('orchestrator.not_found_count', results.filter((r) => r.status === 'not_found').length);

        logger.info('Multi-account request completed', {
          requestId,
          overallStatus,
          accountCount: accountIds.length,
          resultsCount: results.length,
        });

        return {
          requestId,
          overallStatus,
          results,
        };
      }
    );
  }

  private async fanOut(
    accountIds: string[],
    context: RequestContext,
    options: OrchestratorOptions
  ): Promise<AccountResult[]> {
    const maxConcurrency = options.maxConcurrency || MAX_CONCURRENT_REQUESTS;

    // Use Promise.allSettled to get all results even if some fail
    const promises = accountIds.map((accountId) =>
      this.getSingleAccount(accountId, {
        ...context,
        forceRefresh: options.forceRefresh,
      })
    );

    // Limit concurrency by chunking
    const results: AccountResult[] = [];
    for (let i = 0; i < promises.length; i += maxConcurrency) {
      const chunk = promises.slice(i, i + maxConcurrency);
      const chunkResults = await Promise.allSettled(chunk);

      chunkResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // If promise rejected, create an error result
          results.push({
            accountId: 'unknown',
            status: 'unavailable',
            error: {
              code: 'internal_error',
              message: result.reason?.message || 'Unknown error',
            },
          });
        }
      });
    }

    return results;
  }

  private determineOverallStatus(
    results: AccountResult[],
    timedOut: boolean
  ): 'ok' | 'partial' | 'error' {
    if (timedOut) return 'partial';

    const okCount = results.filter((r) => r.status === 'ok').length;
    const totalCount = results.length;

    if (okCount === totalCount) return 'ok';
    if (okCount > 0) return 'partial';
    return 'error';
  }
}

// Singleton instance
let orchestratorInstance: AccountOrchestrator | null = null;

export function getOrchestrator(): AccountOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new AccountOrchestrator();
  }
  return orchestratorInstance;
}
