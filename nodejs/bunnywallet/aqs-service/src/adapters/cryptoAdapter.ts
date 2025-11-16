import type { AccountAdapter, AdapterResult } from './adapter';
import { mapCryptoToCanonical } from '../mappers/cryptoMapper';
import { withResilience } from '../resilience';
import { traceAsync } from '../telemetry/spans';
import { context, propagation } from '@opentelemetry/api';

export class CryptoAdapter implements AccountAdapter {
  accountType = 'crypto' as const;
  backendName = 'crypto-service';
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getSummary(accountId: string, _opts?: any): Promise<AdapterResult> {
    const start = Date.now();

    return traceAsync(
      'adapter.crypto.getSummary',
      {
        'adapter.type': this.accountType,
        'adapter.backend': this.backendName,
        'account.id': accountId,
      },
      async (span) => {
        const exec = async () => {
          // Propagate trace context to backend via HTTP headers
          const headers: Record<string, string> = {
            'X-API-Key': process.env.CRYPTO_API_KEY ?? 'demo-crypto-key',
          };

          // Inject trace context into headers
          propagation.inject(context.active(), headers);

          span.setAttribute('http.url', `${this.baseUrl}/wallets/${accountId}`);
          span.setAttribute('http.method', 'GET');

          const res = await fetch(`${this.baseUrl}/wallets/${accountId}`, {
            headers,
          });

          span.setAttribute('http.status_code', res.status);

          if (!res.ok) {
            if (res.status === 404) {
              throw new Error('wallet_not_found');
            }
            throw new Error(`upstream:${res.status}`);
          }

          const raw = await res.json();
          const mapped = mapCryptoToCanonical(raw as any);
          return { success: true, accountId, raw: mapped };
        };

        try {
          const rawResult = await withResilience(exec, {
            timeoutMs: 1000,
            retries: 1,
            adapter: this.backendName,
          });

          const latency = Date.now() - start;
          span.setAttribute('adapter.latency_ms', latency);
          span.setAttribute('adapter.success', true);

          return {
            success: true,
            accountId,
            raw: rawResult.raw,
            latencyMs: latency,
          };
        } catch (err: any) {
          const latency = Date.now() - start;
          span.setAttribute('adapter.latency_ms', latency);
          span.setAttribute('adapter.success', false);
          span.setAttribute('error.message', err.message);

          return {
            success: false,
            accountId,
            error: { code: 'backend_error', message: err.message },
            latencyMs: latency,
          };
        }
      }
    );
  }

  async health(): Promise<{ healthy: boolean; info?: any }> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      if (!res.ok) return { healthy: false };
      const data = await res.json();
      return { healthy: true, info: data };
    } catch {
      return { healthy: false };
    }
  }
}

export function createCryptoAdapter(): CryptoAdapter {
  const baseUrl = process.env.CRYPTO_SERVICE_URL || 'http://localhost:3006';
  return new CryptoAdapter(baseUrl);
}
