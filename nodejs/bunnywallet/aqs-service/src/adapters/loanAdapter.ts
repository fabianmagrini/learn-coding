import { AccountAdapter, AdapterResult } from './adapter';
import { mapLoanToCanonical } from '../mappers/loanMapper';
import { withResilience } from '../resilience';
import { logger } from '../telemetry/logger';
import { traceAsync } from '../telemetry/spans';
import { context, propagation } from '@opentelemetry/api';

export class LoanAdapter implements AccountAdapter {
  accountType = 'loan' as const;
  backendName = 'loan-service-v1';
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || process.env.LOAN_SERVICE_URL || 'http://localhost:3003';
    this.apiKey = apiKey || process.env.LOAN_API_KEY || 'loan-demo-key-789';
  }

  async getSummary(accountId: string, _opts?: any): Promise<AdapterResult> {
    const start = Date.now();

    return traceAsync(
      'adapter.loan.getSummary',
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

          span.setAttribute('http.url', `${this.baseUrl}/loans/${accountId}`);
          span.setAttribute('http.method', 'GET');

          const response = await fetch(`${this.baseUrl}/loans/${accountId}`, {
            headers,
            signal: AbortSignal.timeout(700),
          });

          span.setAttribute('http.status_code', response.status);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const raw = await response.json() as any;
          return mapLoanToCanonical(raw);
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

          logger.debug('Loan adapter success', {
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

          logger.warn('Loan adapter error', {
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
