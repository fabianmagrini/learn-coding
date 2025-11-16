/**
 * E2E Tests: Multi-Account Aggregation
 *
 * Tests the core functionality of aggregating accounts from multiple backends.
 */

import request from 'supertest';
import { E2E_CONFIG, clearRedisCache } from './setup';

const AQS_URL = E2E_CONFIG.AQS_URL;

describe('E2E: Multi-Account Aggregation', () => {
  beforeEach(async () => {
    // Clear cache before each test for predictable results
    await clearRedisCache();
  });

  describe('GET /v1/accounts?ids=...', () => {
    it('should aggregate multiple accounts from different backends', async () => {
      const accountIds = ['bank-001', 'credit-001', 'loan-001'];

      const response = await request(AQS_URL)
        .get(`/v1/accounts?ids=${accountIds.join(',')}`)
        .expect(200);

      expect(response.body).toMatchObject({
        requestId: expect.any(String),
        overallStatus: 'ok',
        results: expect.arrayContaining([
          {
            accountId: 'bank-001',
            status: 'ok',
            data: expect.objectContaining({
              accountId: 'bank-001',
              accountType: 'bank',
              backendSource: expect.any(String),
            }),
            latencyMs: expect.any(Number),
          },
          {
            accountId: 'credit-001',
            status: 'ok',
            data: expect.objectContaining({
              accountId: 'credit-001',
              accountType: 'creditcard',
              backendSource: expect.any(String),
            }),
            latencyMs: expect.any(Number),
          },
          {
            accountId: 'loan-001',
            status: 'ok',
            data: expect.objectContaining({
              accountId: 'loan-001',
              accountType: 'loan',
              backendSource: expect.any(String),
            }),
            latencyMs: expect.any(Number),
          },
        ]),
        traceId: expect.any(String),
      });

      // Verify we got exactly the number of accounts requested
      expect(response.body.results).toHaveLength(3);
    });

    it('should handle mix of successful and failed accounts (partial status)', async () => {
      // Using a non-existent account ID that should fail
      const accountIds = ['bank-001', 'invalid-999', 'credit-001'];

      const response = await request(AQS_URL)
        .get(`/v1/accounts?ids=${accountIds.join(',')}`)
        .expect(206); // Partial Content

      expect(response.body.overallStatus).toBe('partial');
      expect(response.body.results).toHaveLength(3);

      // At least one should succeed
      const successResults = response.body.results.filter((r: any) => r.status === 'ok');
      expect(successResults.length).toBeGreaterThan(0);
    });

    it('should aggregate all 6 backend types', async () => {
      const accountIds = [
        'bank-001',
        'credit-001',
        'loan-001',
        'invest-001',
        'legacy-001',
        'crypto-001',
      ];

      const response = await request(AQS_URL)
        .get(`/v1/accounts?ids=${accountIds.join(',')}`)
        .expect(200);

      expect(response.body.overallStatus).toBe('ok');
      expect(response.body.results).toHaveLength(6);

      // Verify each account type
      const accountTypes = response.body.results.map((r: any) => r.data?.accountType);
      expect(accountTypes).toEqual(
        expect.arrayContaining(['bank', 'creditcard', 'loan', 'investment', 'legacy', 'crypto'])
      );
    });

    it('should return 400 for missing ids parameter', async () => {
      const response = await request(AQS_URL)
        .get('/v1/accounts')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Missing required query parameter: ids',
      });
    });

    it('should handle large batch requests (concurrency test)', async () => {
      // Create array of 20 account IDs (repeating the available ones)
      const accountIds = Array.from({ length: 20 }, (_, i) => {
        const types = ['bank', 'credit', 'loan', 'invest', 'legacy', 'crypto'];
        const type = types[i % types.length];
        const num = String(Math.floor(i / types.length) + 1).padStart(3, '0');
        return `${type}-${num}`;
      });

      const response = await request(AQS_URL)
        .get(`/v1/accounts?ids=${accountIds.join(',')}`)
        .expect(200);

      expect(response.body.results).toHaveLength(20);
      expect(response.body.requestId).toBeDefined();
      expect(response.body.traceId).toBeDefined();
    });

    it('should include trace ID in response', async () => {
      const response = await request(AQS_URL)
        .get('/v1/accounts?ids=bank-001')
        .expect(200);

      expect(response.body.traceId).toBeDefined();
      expect(response.body.traceId).toMatch(/^[0-9a-f]{32}$/); // 32-char hex string
    });
  });

  describe('GET /v1/accounts/:accountId', () => {
    it('should retrieve single account from bank backend', async () => {
      const response = await request(AQS_URL)
        .get('/v1/accounts/bank-001')
        .expect(200);

      expect(response.body).toMatchObject({
        accountId: 'bank-001',
        accountType: 'bank',
        backendSource: expect.any(String),
        traceId: expect.any(String),
      });
    });

    it('should retrieve crypto account with multi-asset balances', async () => {
      const response = await request(AQS_URL)
        .get('/v1/accounts/crypto-001')
        .expect(200);

      expect(response.body).toMatchObject({
        accountId: 'crypto-001',
        accountType: 'crypto',
        metadata: expect.objectContaining({
          assets: expect.arrayContaining([
            expect.objectContaining({
              symbol: expect.any(String),
              balance: expect.any(Number),
            }),
          ]),
        }),
      });
    });

    it('should return 404 for non-existent account', async () => {
      const response = await request(AQS_URL)
        .get('/v1/accounts/invalid-999')
        .expect(404);

      expect(response.body).toMatchObject({
        error: expect.any(String),
        traceId: expect.any(String),
      });
    });
  });
});
