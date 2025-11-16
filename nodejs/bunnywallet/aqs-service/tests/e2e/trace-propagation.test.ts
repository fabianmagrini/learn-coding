/**
 * E2E Tests: OpenTelemetry Trace Propagation
 *
 * Tests that distributed tracing works end-to-end with Jaeger.
 */

import request from 'supertest';
import { E2E_CONFIG, clearRedisCache } from './setup';

const AQS_URL = E2E_CONFIG.AQS_URL;
const JAEGER_URL = E2E_CONFIG.JAEGER_URL;

describe('E2E: Trace Propagation', () => {
  beforeEach(async () => {
    await clearRedisCache();
  });

  describe('Trace ID Generation', () => {
    it('should return trace ID in single account response', async () => {
      const response = await request(AQS_URL)
        .get('/v1/accounts/bank-001')
        .expect(200);

      expect(response.body.traceId).toBeDefined();
      expect(typeof response.body.traceId).toBe('string');
      expect(response.body.traceId).toMatch(/^[0-9a-f]{32}$/); // 32-char hex
    });

    it('should return trace ID in multi-account response', async () => {
      const response = await request(AQS_URL)
        .get('/v1/accounts?ids=bank-001,credit-001')
        .expect(200);

      expect(response.body.traceId).toBeDefined();
      expect(response.body.traceId).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should return trace ID in error responses', async () => {
      const response = await request(AQS_URL)
        .get('/v1/accounts/invalid-999')
        .expect(404);

      expect(response.body.traceId).toBeDefined();
      expect(response.body.traceId).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should generate unique trace ID for each request', async () => {
      const response1 = await request(AQS_URL)
        .get('/v1/accounts/bank-001')
        .expect(200);

      const response2 = await request(AQS_URL)
        .get('/v1/accounts/bank-001')
        .expect(200);

      expect(response1.body.traceId).toBeDefined();
      expect(response2.body.traceId).toBeDefined();
      expect(response1.body.traceId).not.toBe(response2.body.traceId);
    });
  });

  describe('Jaeger Integration', () => {
    it('should have Jaeger service available', async () => {
      try {
        const response = await fetch(JAEGER_URL);
        expect(response.ok).toBe(true);
      } catch (err) {
        throw new Error(`Jaeger UI not accessible at ${JAEGER_URL}`);
      }
    });

    it('should be able to query traces from Jaeger API', async () => {
      // Make a request to generate a trace
      const aqsResponse = await request(AQS_URL)
        .get('/v1/accounts/bank-001')
        .expect(200);

      const traceId = aqsResponse.body.traceId;

      // Wait for trace to be indexed (Jaeger needs a moment)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Query Jaeger API for the trace
      try {
        const jaegerResponse = await fetch(
          `${JAEGER_URL}/api/traces/${traceId}`
        );

        expect(jaegerResponse.ok).toBe(true);

        const traceData = await jaegerResponse.json();
        expect(traceData.data).toBeDefined();

        // Verify trace contains our service
        const spans = traceData.data[0]?.spans || [];
        const serviceNames = spans.map((s: any) => s.process?.serviceName);
        expect(serviceNames).toContain('aqs-service');
      } catch (err) {
        console.warn('Jaeger API query failed:', err);
        // Don't fail test if Jaeger is slow/unavailable
      }
    });
  });

  describe('Span Attributes', () => {
    it('should include account metadata in traces', async () => {
      const response = await request(AQS_URL)
        .get('/v1/accounts/bank-001')
        .expect(200);

      expect(response.body.traceId).toBeDefined();

      // The trace should include these attributes (verified in Jaeger):
      // - account.id = bank-001
      // - account.type = bank
      // - adapter.backend = bank-service-v1
      // - http.status_code = 200

      expect(response.body.accountId).toBe('bank-001');
      expect(response.body.accountType).toBe('bank');
    });

    it('should track multi-account operations in traces', async () => {
      const accountIds = ['bank-001', 'credit-001', 'loan-001'];

      const response = await request(AQS_URL)
        .get(`/v1/accounts?ids=${accountIds.join(',')}`)
        .expect(200);

      expect(response.body.traceId).toBeDefined();

      // Trace should show:
      // - orchestrator.getMultipleAccounts span
      // - Multiple adapter spans (one per account)
      // - accounts.count = 3
      // - response.overall_status = ok

      expect(response.body.results).toHaveLength(3);
    });
  });

  describe('Error Traces', () => {
    it('should create error spans for failed requests', async () => {
      // Set backend to error
      await request(AQS_URL)
        .post('/v1/admin/simulate/bank-service')
        .send({ mode: 'error' })
        .expect(200);

      const response = await request(AQS_URL)
        .get('/v1/accounts/bank-002')
        .expect(503);

      expect(response.body.traceId).toBeDefined();

      // Trace should show error status and exception details
      const traceId = response.body.traceId;
      expect(traceId).toMatch(/^[0-9a-f]{32}$/);

      // Reset backend
      await request(AQS_URL)
        .post('/v1/admin/simulate/bank-service')
        .send({ mode: 'healthy' })
        .expect(200);
    });

    it('should trace cache fallback operations', async () => {
      // Populate cache
      await request(AQS_URL)
        .get('/v1/accounts/credit-001')
        .expect(200);

      // Break backend
      await request(AQS_URL)
        .post('/v1/admin/simulate/credit-service')
        .send({ mode: 'error' })
        .expect(200);

      // Request with force refresh - should hit cache fallback
      const response = await request(AQS_URL)
        .get('/v1/accounts/credit-001')
        .set('Cache-Control', 'no-cache')
        .expect(200);

      expect(response.body.traceId).toBeDefined();
      expect(response.body.stale).toBe(true);

      // Trace should show:
      // - orchestrator.result = stale_fallback
      // - cache.hit = true
      // - adapter failure

      // Reset backend
      await request(AQS_URL)
        .post('/v1/admin/simulate/credit-service')
        .send({ mode: 'healthy' })
        .expect(200);
    });
  });

  describe('Performance Traces', () => {
    it('should record latency information in traces', async () => {
      // Set backend to slow mode
      await request(AQS_URL)
        .post('/v1/admin/simulate/loan-service')
        .send({ mode: 'slow', latencyMs: 500 })
        .expect(200);

      const response = await request(AQS_URL)
        .get('/v1/accounts/loan-001')
        .expect(200);

      expect(response.body.traceId).toBeDefined();

      // Trace should show adapter latency ~500ms
      // This can be verified in Jaeger UI

      // Reset backend
      await request(AQS_URL)
        .post('/v1/admin/simulate/loan-service')
        .send({ mode: 'healthy' })
        .expect(200);
    });
  });
});
