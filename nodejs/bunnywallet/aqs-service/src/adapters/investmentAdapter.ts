import { AccountAdapter, AdapterResult } from './adapter';
import { mapInvestmentToCanonical } from '../mappers/investmentMapper';
import { withResilience } from '../resilience';
import { logger } from '../telemetry/logger';
import { traceAsync } from '../telemetry/spans';
import { context, propagation } from '@opentelemetry/api';

export class InvestmentAdapter implements AccountAdapter {
  accountType = 'investment' as const;
  backendName = 'investment-service-v1';
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || process.env.INVESTMENT_SERVICE_URL || 'http://localhost:3004';
    this.apiKey = apiKey || process.env.INVESTMENT_API_KEY || 'investment-demo-key-abc';
  }

  async getSummary(accountId: string, _opts?: any): Promise<AdapterResult> {
    const start = Date.now();

    return traceAsync(
      'adapter.investment.getSummary',
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
            'Content-Type': 'application/json',
          };

          // Inject trace context into headers
          propagation.inject(context.active(), headers);

          span.setAttribute('http.url', `${this.baseUrl}/portfolios/${accountId}`);
          span.setAttribute('http.method', 'GET');

          const response = await fetch(`${this.baseUrl}/portfolios/${accountId}`, {
            headers,
            signal: AbortSignal.timeout(700),
          });

          span.setAttribute('http.status_code', response.status);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const raw = await response.json() as any;
          return mapInvestmentToCanonical(raw);
        };

        try {
          const mapped = await withResilience(exec, {
            timeoutMs: 800,
            retries: 1,
            adapter: this.backendName,
          });

          const latency = Date.now() - start;
          span.setAttribute('adapter.latency_ms', latency);
          span.setAttribute('adapter.success', true);

          logger.debug('Investment adapter success', {
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

          logger.warn('Investment adapter error', {
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
        signal: AbortSignal.timeout(1000),
      });
      return { healthy: response.ok };
    } catch {
      return { healthy: false };
    }
  }
}
