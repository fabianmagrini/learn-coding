/**
 * E2E Tests: Cache Behavior
 *
 * Tests the stale-while-revalidate caching pattern and cache invalidation.
 */

import request from 'supertest';
import { E2E_CONFIG, clearRedisCache } from './setup';

const AQS_URL = E2E_CONFIG.AQS_URL;

describe('E2E: Cache Behavior', () => {
  beforeEach(async () => {
    await clearRedisCache();
  });

  describe('Cache Hit/Miss', () => {
    it('should return fresh data on first request (cache miss)', async () => {
      const response = await request(AQS_URL)
        .get('/v1/accounts/bank-001')
        .expect(200);

      expect(response.body.accountId).toBe('bank-001');
      expect(response.body.stale).toBeUndefined();
    });

    it('should return cached data on second request (cache hit)', async () => {
      // First request - populates cache
      const firstResponse = await request(AQS_URL)
        .get('/v1/accounts/bank-001')
        .expect(200);

      const firstBalance = firstResponse.body.balances?.[0]?.available;

      // Second request - should hit cache
      const secondResponse = await request(AQS_URL)
        .get('/v1/accounts/bank-001')
        .expect(200);

      const secondBalance = secondResponse.body.balances?.[0]?.available;

      // Data should be identical (from cache)
      expect(secondBalance).toBe(firstBalance);
      expect(secondResponse.body.stale).toBeUndefined();
    });

    it('should bypass cache with Cache-Control: no-cache header', async () => {
      // First request - populate cache
      await request(AQS_URL)
        .get('/v1/accounts/bank-001')
        .expect(200);

      // Second request with no-cache - should bypass cache
      const response = await request(AQS_URL)
        .get('/v1/accounts/bank-001')
        .set('Cache-Control', 'no-cache')
        .expect(200);

      expect(response.body.accountId).toBe('bank-001');
      // Data might be fresh from backend
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache via DELETE /v1/cache/:accountId', async () => {
      // Populate cache
      await request(AQS_URL)
        .get('/v1/accounts/bank-001')
        .expect(200);

      // Invalidate cache
      await request(AQS_URL)
        .delete('/v1/cache/bank-001')
        .expect(204);

      // Next request should be cache miss
      const response = await request(AQS_URL)
        .get('/v1/accounts/bank-001')
        .expect(200);

      expect(response.body.accountId).toBe('bank-001');
    });

    it('should clear all cache via DELETE /v1/cache', async () => {
      // Populate cache with multiple accounts
      await request(AQS_URL)
        .get('/v1/accounts?ids=bank-001,credit-001,loan-001')
        .expect(200);

      // Clear all cache
      await request(AQS_URL)
        .delete('/v1/cache')
        .expect(204);

      // Subsequent requests should be cache misses
      const response = await request(AQS_URL)
        .get('/v1/accounts/bank-001')
        .expect(200);

      expect(response.body.accountId).toBe('bank-001');
    });
  });

  describe('Stale-While-Revalidate Pattern', () => {
    it('should return stale data when backend is unavailable', async () => {
      // Step 1: Populate cache with fresh data
      const freshResponse = await request(AQS_URL)
        .get('/v1/accounts/bank-001')
        .expect(200);

      expect(freshResponse.body.stale).toBeUndefined();

      // Step 2: Set backend to error mode
      await request(AQS_URL)
        .post('/v1/admin/simulate/bank-service')
        .send({ mode: 'error' })
        .expect(200);

      // Wait a moment for backend to be in error state
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 3: Request with force refresh - should return stale data
      const staleResponse = await request(AQS_URL)
        .get('/v1/accounts/bank-001')
        .set('Cache-Control', 'no-cache')
        .expect(200); // Returns 200 with stale data instead of 503

      expect(staleResponse.body.accountId).toBe('bank-001');
      expect(staleResponse.body.stale).toBe(true);

      // Step 4: Reset backend to healthy
      await request(AQS_URL)
        .post('/v1/admin/simulate/bank-service')
        .send({ mode: 'healthy' })
        .expect(200);
    });

    it('should return 503 when backend fails and no cache exists', async () => {
      // Set backend to error mode BEFORE any requests
      await request(AQS_URL)
        .post('/v1/admin/simulate/bank-service')
        .send({ mode: 'error' })
        .expect(200);

      // Request should fail with 503 (no stale cache available)
      const response = await request(AQS_URL)
        .get('/v1/accounts/bank-002')
        .expect(503);

      expect(response.body).toMatchObject({
        error: expect.any(String),
        traceId: expect.any(String),
      });

      // Reset backend
      await request(AQS_URL)
        .post('/v1/admin/simulate/bank-service')
        .send({ mode: 'healthy' })
        .expect(200);
    });
  });

  describe('Multi-Account Cache Behavior', () => {
    it('should use cache for some accounts and fetch others', async () => {
      // Populate cache for bank-001
      await request(AQS_URL)
        .get('/v1/accounts/bank-001')
        .expect(200);

      // Request multiple accounts (one cached, one not)
      const response = await request(AQS_URL)
        .get('/v1/accounts?ids=bank-001,credit-001')
        .expect(200);

      expect(response.body.results).toHaveLength(2);
      expect(response.body.overallStatus).toBe('ok');

      // Both should succeed
      const statuses = response.body.results.map((r: any) => r.status);
      expect(statuses).toEqual(['ok', 'ok']);
    });

    it('should respect force refresh for multi-account requests', async () => {
      // Populate cache
      await request(AQS_URL)
        .get('/v1/accounts?ids=bank-001,credit-001')
        .expect(200);

      // Force refresh all
      const response = await request(AQS_URL)
        .get('/v1/accounts?ids=bank-001,credit-001')
        .set('Cache-Control', 'no-cache')
        .expect(200);

      expect(response.body.overallStatus).toBe('ok');
      expect(response.body.results).toHaveLength(2);
    });
  });
});
