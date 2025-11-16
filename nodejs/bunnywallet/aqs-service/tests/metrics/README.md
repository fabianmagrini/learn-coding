# Metrics Tests

Unit tests for Prometheus metrics integration.

## Overview

These tests verify that:
- Metrics endpoint (`/metrics`) is accessible
- All metrics are properly registered
- Metrics are recorded with correct labels
- Metric types (Counter, Gauge, Histogram) work correctly
- Metric values increment/update as expected

## Running Tests

```bash
# Run metrics tests only
npx jest tests/metrics

# Run with coverage
npx jest tests/metrics --coverage

# Watch mode
npx jest tests/metrics --watch
```

## Test Coverage

### Endpoint Tests
- ✅ `/metrics` endpoint returns 200
- ✅ Content-Type is `text/plain` (Prometheus format)
- ✅ Metrics text is properly formatted

### Metric Presence
- ✅ HTTP request metrics (`aqs_http_requests_total`, `aqs_request_latency_ms`)
- ✅ Adapter metrics (`adapter_calls_total`, `adapter_latency_ms`)
- ✅ Cache metrics (`cache_hits_total`, `cache_misses_total`, `cache_stale_total`)
- ✅ Circuit breaker metrics (`circuit_breaker_state`)
- ✅ Partial response metrics (`accounts_partial_responses_total`)
- ✅ System health metrics (`redis_connection_status`, `adapter_health_status`)
- ✅ Timeout and retry metrics (`adapter_timeouts_total`, `adapter_retries_total`)

### Label Verification
- ✅ Metrics include expected labels
- ✅ Multiple label values work correctly
- ✅ Label cardinality is controlled

### Metric Type Verification
- ✅ Counters are properly typed
- ✅ Histograms include buckets, sum, and count
- ✅ Gauges update correctly

### Value Verification
- ✅ Counters increment correctly
- ✅ Gauges update to new values
- ✅ Histograms record observations in buckets

## Example Output

```
 PASS  tests/metrics/metrics.test.ts
  Prometheus Metrics
    GET /metrics
      ✓ should expose Prometheus metrics endpoint (45ms)
      ✓ should include HTTP request metrics (12ms)
      ✓ should include adapter metrics (8ms)
      ✓ should include cache metrics (7ms)
      ✓ should include circuit breaker metrics (6ms)
      ✓ should include partial response metrics (5ms)
      ✓ should include system health metrics (9ms)
      ✓ should include timeout and retry metrics (7ms)
    Metric Labels
      ✓ should record metrics with correct labels (8ms)
      ✓ should support multiple label values (7ms)
    Metric Types
      ✓ should expose counter metrics (6ms)
      ✓ should expose histogram metrics with buckets (8ms)
      ✓ should expose gauge metrics (6ms)
    Metric Values
      ✓ should increment counters correctly (10ms)
      ✓ should update gauges correctly (9ms)
      ✓ should record histogram observations (11ms)

Test Suites: 1 passed, 1 total
Tests:       16 passed, 16 total
```

## Metrics Format

Prometheus text format example:

```
# HELP aqs_http_requests_total Total number of HTTP requests
# TYPE aqs_http_requests_total counter
aqs_http_requests_total{route="/v1/accounts/:accountId",method="GET",code="200"} 1523

# HELP adapter_latency_ms Adapter call latency in milliseconds
# TYPE adapter_latency_ms histogram
adapter_latency_ms_bucket{adapter="bank-service",le="50"} 450
adapter_latency_ms_bucket{adapter="bank-service",le="100"} 890
adapter_latency_ms_bucket{adapter="bank-service",le="200"} 1200
adapter_latency_ms_bucket{adapter="bank-service",le="+Inf"} 1500
adapter_latency_ms_sum{adapter="bank-service"} 125000
adapter_latency_ms_count{adapter="bank-service"} 1500

# HELP cache_hits_total Total number of cache hits
# TYPE cache_hits_total counter
cache_hits_total{account_type="bank"} 2345
cache_hits_total{account_type="creditcard"} 1890

# HELP circuit_breaker_state Circuit breaker state (0=closed, 1=open, 2=half-open)
# TYPE circuit_breaker_state gauge
circuit_breaker_state{adapter="bank-service"} 0
circuit_breaker_state{adapter="legacy-service"} 1
```

## Best Practices

### Test Isolation
- Reset metrics between tests when needed: `register.resetMetrics()`
- Use unique label values to avoid conflicts
- Clean up resources (Redis connections) in `afterAll()`

### Assertion Patterns
```typescript
// Check metric existence
expect(metrics).toContain('metric_name');

// Check metric with labels
expect(metrics).toMatch(/metric_name\{label="value"\}/);

// Check metric type
expect(metrics).toMatch(/# TYPE metric_name counter/);

// Check metric value
expect(metrics).toMatch(/metric_name\{.*\} 123/);
```

### Testing Helper Functions
```typescript
// Use helper functions for recording
recordAdapterCall('service', true, 100);

// Verify through metrics endpoint
const metrics = await register.metrics();
expect(metrics).toContain('adapter_calls_total');
```

## Integration with E2E Tests

These unit tests complement the E2E tests in `tests/e2e/`. While E2E tests verify metrics in a live system:

```typescript
// E2E test example
const response = await request(AQS_URL).get('/v1/accounts/bank-001');
const metrics = await request(AQS_URL).get('/metrics');
expect(metrics.text).toContain('aqs_http_requests_total');
```

Unit tests focus on the metrics system itself.

## Troubleshooting

### Metrics Not Found
If a metric doesn't appear:
1. Ensure the metric is registered in `src/telemetry/metrics.ts`
2. Check that the recording function is called
3. Verify labels are provided correctly

### Incorrect Values
If metric values are wrong:
1. Check for test isolation (reset metrics if needed)
2. Verify the recording function logic
3. Ensure histogram buckets are configured correctly

### Label Cardinality Issues
If you get warnings about high cardinality:
- Review label values (should be bounded sets)
- Avoid using dynamic values (IDs, timestamps)
- Use traces/logs for high-cardinality data

## Resources

- [Prometheus Metric Types](https://prometheus.io/docs/concepts/metric_types/)
- [prom-client Documentation](https://github.com/siimon/prom-client)
- [Metric Naming Best Practices](https://prometheus.io/docs/practices/naming/)
