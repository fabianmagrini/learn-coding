/**
 * E2E Tests: Backend Failure Scenarios
 *
 * Tests graceful degradation, circuit breakers, retries, and timeouts.
 */

import request from 'supertest';
import { E2E_CONFIG, clearRedisCache } from './setup';

const AQS_URL = E2E_CONFIG.AQS_URL;

describe('E2E: Backend Failure Scenarios', () => {
  beforeEach(async () => {
    await clearRedisCache();
    // Reset all backends to healthy state
    const backends = ['bank-service', 'credit-service', 'loan-service',
                      'investment-service', 'legacy-service', 'crypto-service'];
    for (const backend of backends) {
      await request(AQS_URL)
        .post(`/v1/admin/simulate/${backend}`)
        .send({ mode: 'healthy' });
    }
  });

  afterEach(async () => {
    // Cleanup: reset all backends after each test
    const backends = ['bank-service', 'credit-service', 'loan-service',
                      'investment-service', 'legacy-service', 'crypto-service'];
    for (const backend of backends) {
      await request(AQS_URL)
        .post(`/v1/admin/simulate/${backend}`)
        .send({ mode: 'healthy' });
    }
  });

  describe('Single Backend Failure', () => {
    it('should handle slow backend gracefully', async () => {
      // Set credit service to slow mode (1500ms latency)
      await request(AQS_URL)
        .post('/v1/admin/simulate/credit-service')
        .send({ mode: 'slow', latencyMs: 1500 })
        .expect(200);

      const startTime = Date.now();
      const response = await request(AQS_URL)
        .get('/v1/accounts/credit-001')
        .expect(200);

      const duration = Date.now() - startTime;

      expect(response.body.accountId).toBe('credit-001');
      // Should complete despite slowness (with retries/timeouts)
      expect(duration).toBeGreaterThan(1000);
    });

    it('should handle error backend with stale cache fallback', async () => {
      // Step 1: Populate cache
      await request(AQS_URL)
        .get('/v1/accounts/loan-001')
        .expect(200);

      // Step 2: Set backend to error mode
      await request(AQS_URL)
        .post('/v1/admin/simulate/loan-service')
        .send({ mode: 'error' })
        .expect(200);

      // Step 3: Force refresh - should return stale data
      const response = await request(AQS_URL)
        .get('/v1/accounts/loan-001')
        .set('Cache-Control', 'no-cache')
        .expect(200);

      expect(response.body.accountId).toBe('loan-001');
      expect(response.body.stale).toBe(true);
    });

    it('should handle flaky backend (intermittent errors)', async () => {
      // Set backend to flaky mode
      await request(AQS_URL)
        .post('/v1/admin/simulate/investment-service')
        .send({ mode: 'flaky' })
        .expect(200);

      // Make multiple requests - some should succeed due to retries
      const results = await Promise.allSettled([
        request(AQS_URL).get('/v1/accounts/invest-001'),
        request(AQS_URL).get('/v1/accounts/invest-001'),
        request(AQS_URL).get('/v1/accounts/invest-001'),
      ]);

      // At least one should succeed (retries help)
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('Multi-Backend Failure', () => {
    it('should return partial status when some backends fail', async () => {
      // Set credit and loan services to error
      await request(AQS_URL)
        .post('/v1/admin/simulate/credit-service')
        .send({ mode: 'error' })
        .expect(200);

      await request(AQS_URL)
        .post('/v1/admin/simulate/loan-service')
        .send({ mode: 'error' })
        .expect(200);

      const response = await request(AQS_URL)
        .get('/v1/accounts?ids=bank-001,credit-001,loan-001')
        .expect(206); // Partial Content

      expect(response.body.overallStatus).toBe('partial');
      expect(response.body.results).toHaveLength(3);

      // Bank should succeed, credit and loan should fail
      const bankResult = response.body.results.find((r: any) => r.accountId === 'bank-001');
      expect(bankResult.status).toBe('ok');

      const creditResult = response.body.results.find((r: any) => r.accountId === 'credit-001');
      expect(creditResult.status).toBe('unavailable');
    });

    it('should return error status when all backends fail', async () => {
      // Set all requested backends to error
      await request(AQS_URL)
        .post('/v1/admin/simulate/bank-service')
        .send({ mode: 'error' });

      await request(AQS_URL)
        .post('/v1/admin/simulate/credit-service')
        .send({ mode: 'error' });

      const response = await request(AQS_URL)
        .get('/v1/accounts?ids=bank-001,credit-001')
        .expect(500);

      expect(response.body.overallStatus).toBe('error');
      expect(response.body.results.every((r: any) => r.status === 'unavailable')).toBe(true);
    });
  });

  describe('Circuit Breaker & Resilience', () => {
    it('should handle cascading failures gracefully', async () => {
      // Simulate all backends becoming slow simultaneously
      const backends = ['bank-service', 'credit-service', 'loan-service'];
      for (const backend of backends) {
        await request(AQS_URL)
          .post(`/v1/admin/simulate/${backend}`)
          .send({ mode: 'slow', latencyMs: 2000 });
      }

      const startTime = Date.now();
      const response = await request(AQS_URL)
        .get('/v1/accounts?ids=bank-001,credit-001,loan-001')
        .timeout(10000); // Allow time for timeouts/retries

      const duration = Date.now() - startTime;

      // Should not take forever (timeout protection)
      expect(duration).toBeLessThan(8000);
      expect(response.body.requestId).toBeDefined();
    });

    it('should maintain service availability under partial failures', async () => {
      // Half the backends fail
      await request(AQS_URL)
        .post('/v1/admin/simulate/credit-service')
        .send({ mode: 'error' });

      await request(AQS_URL)
        .post('/v1/admin/simulate/loan-service')
        .send({ mode: 'error' });

      await request(AQS_URL)
        .post('/v1/admin/simulate/legacy-service')
        .send({ mode: 'error' });

      // Service should still work for healthy backends
      const response = await request(AQS_URL)
        .get('/v1/accounts?ids=bank-001,invest-001,crypto-001')
        .expect(200);

      expect(response.body.overallStatus).toBe('ok');
      expect(response.body.results.every((r: any) => r.status === 'ok')).toBe(true);
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout slow backends and continue', async () => {
      // Set legacy service to extremely slow (beyond timeout)
      await request(AQS_URL)
        .post('/v1/admin/simulate/legacy-service')
        .send({ mode: 'slow', latencyMs: 5000 })
        .expect(200);

      const startTime = Date.now();
      const response = await request(AQS_URL)
        .get('/v1/accounts/legacy-001')
        .timeout(8000);

      const duration = Date.now() - startTime;

      // Should timeout before 5000ms
      expect(duration).toBeLessThan(3000);

      // Should return error or unavailable status
      expect([503, 500]).toContain(response.status);
    });

    it('should handle overall request timeout for multi-account', async () => {
      // Make ALL backends slow
      const backends = ['bank-service', 'credit-service', 'loan-service',
                        'investment-service', 'legacy-service', 'crypto-service'];
      for (const backend of backends) {
        await request(AQS_URL)
          .post(`/v1/admin/simulate/${backend}`)
          .send({ mode: 'slow', latencyMs: 1500 });
      }

      const accountIds = ['bank-001', 'credit-001', 'loan-001',
                          'invest-001', 'legacy-001', 'crypto-001'];

      const startTime = Date.now();
      const response = await request(AQS_URL)
        .get(`/v1/accounts?ids=${accountIds.join(',')}`)
        .timeout(10000);

      const duration = Date.now() - startTime;

      // Overall timeout should kick in
      expect(duration).toBeLessThan(5000);
      expect(response.body.requestId).toBeDefined();
    });
  });
});
