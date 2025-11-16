/**
 * Pact Consumer Contract Test: Legacy Adapter
 *
 * This test defines the contract between AQS (consumer) and legacy-service (provider).
 */

import { Pact } from '@pact-foundation/pact';
import { like, term } from '@pact-foundation/pact/src/dsl/matchers';
import path from 'path';
import { LegacyAdapter } from '../../src/adapters/legacyAdapter';

describe('Pact Contract: LegacyAdapter → legacy-service', () => {
  const provider = new Pact({
    consumer: 'aqs-service',
    provider: 'legacy-service',
    port: 3005,
    log: path.resolve(process.cwd(), 'logs', 'pact.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'warn',
  });

  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  afterEach(() => provider.verify());

  describe('GET /account/:accountId', () => {
    it('should retrieve legacy account successfully (CSV format)', async () => {
      await provider.addInteraction({
        state: 'account legacy-001 exists',
        uponReceiving: 'a request for legacy account legacy-001',
        withRequest: {
          method: 'GET',
          path: '/account/legacy-001',
          headers: {
            'X-API-Key': 'legacy-demo-key-xyz',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
          },
          body: like('account_id,account_number,customer_name,balance,currency,status,last_update\nlegacy-001,ACC-987654,Mary Davis,8900.50,USD,active,2024-01-15'),
        },
      });

      const adapter = new LegacyAdapter('http://localhost:3005', 'legacy-demo-key-xyz');
      const result = await adapter.getSummary('legacy-001');

      expect(result.success).toBe(true);
      expect(result.accountId).toBe('legacy-001');
      expect(result.raw).toMatchObject({
        accountId: 'legacy-001',
        accountType: 'legacy',
        balances: expect.arrayContaining([
          expect.objectContaining({
            currency: 'USD',
            available: expect.any(Number),
          }),
        ]),
      });
    });

    it('should handle legacy account not found (404)', async () => {
      await provider.addInteraction({
        state: 'account legacy-999 does not exist',
        uponReceiving: 'a request for non-existent legacy account legacy-999',
        withRequest: {
          method: 'GET',
          path: '/account/legacy-999',
          headers: {
            'X-API-Key': 'legacy-demo-key-xyz',
          },
        },
        willRespondWith: {
          status: 404,
          headers: {
            'Content-Type': term({
              generate: 'text/plain',
              matcher: 'text/plain|application/json',
            }),
          },
          body: like('Account not found'),
        },
      });

      const adapter = new LegacyAdapter('http://localhost:3005', 'legacy-demo-key-xyz');
      const result = await adapter.getSummary('legacy-999');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('GET /health', () => {
    it('should verify health endpoint', async () => {
      await provider.addInteraction({
        state: 'service is healthy',
        uponReceiving: 'a health check request',
        withRequest: {
          method: 'GET',
          path: '/health',
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': term({
              generate: 'text/plain',
              matcher: 'text/plain|application/json',
            }),
          },
          body: like('OK'),
        },
      });

      const adapter = new LegacyAdapter('http://localhost:3005', 'legacy-demo-key-xyz');
      const result = await adapter.health();

      expect(result.healthy).toBe(true);
    });
  });
});
