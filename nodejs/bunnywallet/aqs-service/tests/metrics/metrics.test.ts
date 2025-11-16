/**
 * Metrics Integration Tests
 *
 * Verify that Prometheus metrics are properly recorded and exposed
 */

import request from 'supertest';
import { createApp, initializeAdapters } from '../../src/server';
import { getCache } from '../../src/cache';
import {
  recordHttpRequest,
  recordAdapterCall,
  recordCacheHit,
  recordCacheMiss,
  recordCacheStale,
  recordCircuitBreakerState,
  recordPartialResponse,
  recordRedisConnection,
  recordAdapterHealth,
  recordTimeout,
  recordRetry,
  register,
} from '../../src/telemetry/metrics';

describe('Prometheus Metrics', () => {
  let app: any;

  beforeAll(() => {
    initializeAdapters();
    app = createApp();
  });

  afterAll(async () => {
    const cache = getCache();
    await cache.close();
  });

  describe('GET /metrics', () => {
    it('should expose Prometheus metrics endpoint', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toBeDefined();
    });

    it('should include HTTP request metrics', async () => {
      recordHttpRequest('/v1/accounts/:id', 'GET', 200, 150);

      const metrics = await register.metrics();

      expect(metrics).toContain('aqs_http_requests_total');
      expect(metrics).toContain('aqs_request_latency_ms');
    });

    it('should include adapter metrics', async () => {
      recordAdapterCall('bank-service', true, 100);
      recordAdapterCall('credit-service', false, 500);

      const metrics = await register.metrics();

      expect(metrics).toContain('adapter_calls_total');
      expect(metrics).toContain('adapter_latency_ms');
      expect(metrics).toContain('bank-service');
    });

    it('should include cache metrics', async () => {
      recordCacheHit('bank');
      recordCacheMiss('creditcard');
      recordCacheStale('loan');

      const metrics = await register.metrics();

      expect(metrics).toContain('cache_hits_total');
      expect(metrics).toContain('cache_misses_total');
      expect(metrics).toContain('cache_stale_total');
    });

    it('should include circuit breaker metrics', async () => {
      recordCircuitBreakerState('bank-service', 0); // closed
      recordCircuitBreakerState('credit-service', 1); // open

      const metrics = await register.metrics();

      expect(metrics).toContain('circuit_breaker_state');
      expect(metrics).toContain('bank-service');
      expect(metrics).toContain('credit-service');
    });

    it('should include partial response metrics', async () => {
      recordPartialResponse();
      recordPartialResponse();

      const metrics = await register.metrics();

      expect(metrics).toContain('accounts_partial_responses_total');
    });

    it('should include system health metrics', async () => {
      recordRedisConnection(true);
      recordAdapterHealth('bank-service', true);
      recordAdapterHealth('legacy-service', false);

      const metrics = await register.metrics();

      expect(metrics).toContain('redis_connection_status');
      expect(metrics).toContain('adapter_health_status');
    });

    it('should include timeout and retry metrics', async () => {
      recordTimeout('legacy-service');
      recordRetry('loan-service');

      const metrics = await register.metrics();

      expect(metrics).toContain('adapter_timeouts_total');
      expect(metrics).toContain('adapter_retries_total');
    });
  });

  describe('Metric Labels', () => {
    it('should record metrics with correct labels', async () => {
      recordAdapterCall('investment-service', true, 250);

      const metrics = await register.metrics();

      expect(metrics).toMatch(/adapter_calls_total\{adapter="investment-service",success="true"\}/);
    });

    it('should support multiple label values', async () => {
      recordCacheHit('bank');
      recordCacheHit('crypto');

      const metrics = await register.metrics();

      expect(metrics).toMatch(/cache_hits_total\{account_type="bank"\}/);
      expect(metrics).toMatch(/cache_hits_total\{account_type="crypto"\}/);
    });
  });

  describe('Metric Types', () => {
    it('should expose counter metrics', async () => {
      const metrics = await register.metrics();

      // Counters should have TYPE counter
      expect(metrics).toMatch(/# TYPE aqs_http_requests_total counter/);
      expect(metrics).toMatch(/# TYPE adapter_calls_total counter/);
    });

    it('should expose histogram metrics with buckets', async () => {
      const metrics = await register.metrics();

      // Histograms should have buckets
      expect(metrics).toMatch(/# TYPE aqs_request_latency_ms histogram/);
      expect(metrics).toContain('aqs_request_latency_ms_bucket');
      expect(metrics).toContain('aqs_request_latency_ms_sum');
      expect(metrics).toContain('aqs_request_latency_ms_count');
    });

    it('should expose gauge metrics', async () => {
      const metrics = await register.metrics();

      // Gauges for circuit breaker and health
      expect(metrics).toMatch(/# TYPE circuit_breaker_state gauge/);
      expect(metrics).toMatch(/# TYPE redis_connection_status gauge/);
    });
  });

  describe('Metric Values', () => {
    beforeEach(async () => {
      // Reset metrics
      register.resetMetrics();
    });

    it('should increment counters correctly', async () => {
      recordHttpRequest('/test', 'GET', 200, 100);
      recordHttpRequest('/test', 'GET', 200, 150);

      const metrics = await register.metrics();

      // Should show 2 requests
      expect(metrics).toMatch(/aqs_http_requests_total.*\} 2/);
    });

    it('should update gauges correctly', async () => {
      recordCircuitBreakerState('test-adapter', 0);
      let metrics = await register.metrics();
      expect(metrics).toMatch(/circuit_breaker_state\{adapter="test-adapter"\} 0/);

      recordCircuitBreakerState('test-adapter', 1);
      metrics = await register.metrics();
      expect(metrics).toMatch(/circuit_breaker_state\{adapter="test-adapter"\} 1/);
    });

    it('should record histogram observations', async () => {
      recordAdapterCall('test-service', true, 75);
      recordAdapterCall('test-service', true, 150);
      recordAdapterCall('test-service', true, 300);

      const metrics = await register.metrics();

      // Should have observations in different buckets
      expect(metrics).toMatch(/adapter_latency_ms_bucket.*adapter="test-service"/);
      expect(metrics).toMatch(/adapter_latency_ms_sum.*adapter="test-service"/);
      expect(metrics).toMatch(/adapter_latency_ms_count.*adapter="test-service"/);
    });
  });
});
