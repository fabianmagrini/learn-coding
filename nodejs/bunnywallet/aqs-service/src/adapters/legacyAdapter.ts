import { AccountAdapter, AdapterResult } from './adapter';
import { mapLegacyToCanonical } from '../mappers/legacyMapper';
import { withResilience } from '../resilience';
import { logger } from '../telemetry/logger';
import { traceAsync } from '../telemetry/spans';
import { context, propagation } from '@opentelemetry/api';

export class LegacyAdapter implements AccountAdapter {
  accountType = 'legacy' as const;
  backendName = 'legacy-service-v1';
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || process.env.LEGACY_SERVICE_URL || 'http://localhost:3005';
    this.apiKey = apiKey || process.env.LEGACY_API_KEY || 'legacy-demo-key-xyz';
  }

  async getSummary(accountId: string, _opts?: any): Promise<AdapterResult> {
    const start = Date.now();

    return traceAsync(
      'adapter.legacy.getSummary',
      {
        'adapter.type': this.accountType,
        'adapter.backend': this.backendName,
        'account.id': accountId,
      },
      async (span) => {
        const exec = async () => {
          // Propagate trace context to backend via HTTP headers
          const headers: Record<string, string> = {
            'X-API-Key': this.apiKey,
          };

          // Inject trace context into headers
          propagation.inject(context.active(), headers);

          span.setAttribute('http.url', `${this.baseUrl}/account/${accountId}`);
          span.setAttribute('http.method', 'GET');

          const response = await fetch(`${this.baseUrl}/account/${accountId}`, {
            headers,
            signal: AbortSignal.timeout(1200), // Legacy service is slower
          });

          span.setAttribute('http.status_code', response.status);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const csvData = await response.text();
          return mapLegacyToCanonical(csvData);
        };

        try {
          const mapped = await withResilience(exec, {
            timeoutMs: 1500,
            retries: 2, // Retry more for flaky legacy system
            adapter: this.backendName,
          });

          const latency = Date.now() - start;
          span.setAttribute('adapter.latency_ms', latency);
          span.setAttribute('adapter.success', true);

          logger.debug('Legacy adapter success', {
            accountId,
            latencyMs: latency,
          });

          return {
            success: true,
            accountId,
            raw: mapped,
            latencyMs: latency,
          };
        } catch (err: any) {
          const latency = Date.now() - start;
          span.setAttribute('adapter.latency_ms', latency);
          span.setAttribute('adapter.success', false);
          span.setAttribute('error.message', err.message);

          logger.warn('Legacy adapter error', {
            accountId,
            error: err.message,
            latencyMs: latency,
          });

          return {
            success: false,
            accountId,
            error: {
              code: 'backend_error',
              message: err.message,
            },
            latencyMs: latency,
          };
        }
      }
    );
  }

  async health(): Promise<{ healthy: boolean; info?: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      return { healthy: response.ok };
    } catch {
      return { healthy: false };
    }
  }
}
