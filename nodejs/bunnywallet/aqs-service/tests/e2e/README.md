# E2E Test Suite

Comprehensive end-to-end tests for the BunnyWallet Account Query Service (AQS).

## Overview

These tests verify the complete system behavior including:
- Multi-account aggregation from 6 different backends
- Stale-while-revalidate caching pattern
- Graceful degradation under failures
- Circuit breaker and retry logic
- OpenTelemetry distributed tracing

## Prerequisites

1. **Docker Compose environment must be running**:
   ```bash
   cd /path/to/bunnywallet
   docker-compose up -d
   ```

2. **Wait for services to be ready** (~30 seconds):
   - AQS service: http://localhost:8080
   - Redis: localhost:6379
   - 6 backend services (ports 3001-3006)
   - Jaeger UI: http://localhost:16686

3. **Verify services are healthy**:
   ```bash
   curl http://localhost:8080/healthz
   curl http://localhost:16686
   ```

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run specific test suite
```bash
# Multi-account aggregation
npx jest tests/e2e/multi-account.test.ts

# Cache behavior
npx jest tests/e2e/cache-behavior.test.ts

# Failure scenarios
npx jest tests/e2e/failure-scenarios.test.ts

# Trace propagation
npx jest tests/e2e/trace-propagation.test.ts
```

### Watch mode (re-run on changes)
```bash
npm run test:e2e:watch
```

### Run with verbose output
```bash
npm run test:e2e -- --verbose
```

## Test Suites

### 1. Multi-Account Aggregation (`multi-account.test.ts`)

Tests the core account aggregation functionality:

- ✅ Aggregate multiple accounts from different backends
- ✅ Handle mix of successful and failed accounts (partial status)
- ✅ Support all 6 backend types (bank, credit, loan, investment, legacy, crypto)
- ✅ Validate error handling for invalid requests
- ✅ Test large batch requests (concurrency limits)
- ✅ Verify trace ID inclusion in responses

**Key Test Cases:**
```typescript
// Basic aggregation
GET /v1/accounts?ids=bank-001,credit-001,loan-001
Expected: 200 OK, overallStatus: 'ok', 3 results

// All backend types
GET /v1/accounts?ids=bank-001,credit-001,loan-001,invest-001,legacy-001,crypto-001
Expected: 200 OK, 6 results with correct account types

// Single account
GET /v1/accounts/bank-001
Expected: 200 OK, account data with traceId
```

### 2. Cache Behavior (`cache-behavior.test.ts`)

Tests the stale-while-revalidate caching pattern:

- ✅ Cache hit/miss behavior
- ✅ Bypass cache with `Cache-Control: no-cache` header
- ✅ Cache invalidation via DELETE endpoints
- ✅ Stale data fallback when backends fail
- ✅ Multi-account cache interactions

**Key Test Cases:**
```typescript
// Cache hit
1. GET /v1/accounts/bank-001  // Populates cache
2. GET /v1/accounts/bank-001  // Cache hit

// Stale fallback
1. GET /v1/accounts/bank-001  // Populate cache
2. Simulate backend error
3. GET /v1/accounts/bank-001 + Cache-Control: no-cache
Expected: 200 OK with stale: true

// Cache invalidation
DELETE /v1/cache/bank-001
Expected: 204 No Content, cache cleared
```

### 3. Failure Scenarios (`failure-scenarios.test.ts`)

Tests graceful degradation and resilience:

- ✅ Slow backend handling (timeouts)
- ✅ Error backend with stale cache fallback
- ✅ Flaky backend (intermittent failures)
- ✅ Multi-backend failures (partial/error status)
- ✅ Circuit breaker behavior
- ✅ Timeout protection

**Key Test Cases:**
```typescript
// Slow backend
POST /v1/admin/simulate/credit-service { mode: 'slow', latencyMs: 1500 }
GET /v1/accounts/credit-001
Expected: Completes with retries/timeouts

// Partial failure
POST /v1/admin/simulate/credit-service { mode: 'error' }
POST /v1/admin/simulate/loan-service { mode: 'error' }
GET /v1/accounts?ids=bank-001,credit-001,loan-001
Expected: 206 Partial Content, bank succeeds, others fail

// All backends fail
Simulate all backends as 'error'
GET /v1/accounts?ids=bank-001,credit-001
Expected: 500 Internal Server Error, overallStatus: 'error'
```

### 4. Trace Propagation (`trace-propagation.test.ts`)

Tests OpenTelemetry distributed tracing:

- ✅ Trace ID generation and uniqueness
- ✅ Trace ID in success and error responses
- ✅ Jaeger integration and API queries
- ✅ Span attributes (account metadata)
- ✅ Error span creation
- ✅ Performance trace recording

**Key Test Cases:**
```typescript
// Trace ID validation
GET /v1/accounts/bank-001
Expected: traceId matches /^[0-9a-f]{32}$/

// Jaeger query
1. GET /v1/accounts/bank-001 → extract traceId
2. Wait 2 seconds for indexing
3. GET http://localhost:16686/api/traces/{traceId}
Expected: Trace found with serviceName: 'aqs-service'

// Error traces
1. Simulate backend error
2. GET /v1/accounts/bank-002
Expected: 503 with traceId, trace shows error spans
```

## Configuration

Test configuration is in `tests/e2e/setup.ts`:

```typescript
export const E2E_CONFIG = {
  AQS_URL: process.env.AQS_URL || 'http://localhost:8080',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  JAEGER_URL: process.env.JAEGER_URL || 'http://localhost:16686',
};
```

Override via environment variables:
```bash
AQS_URL=http://custom-host:8080 npm run test:e2e
```

## Troubleshooting

### Tests fail with "Service not ready"
```bash
# Verify services are running
docker-compose ps

# Check service logs
docker-compose logs aqs-service
docker-compose logs redis

# Restart services
docker-compose restart
```

### Tests timeout
```bash
# Increase Jest timeout (already set to 30s in setup.ts)
# Check if services are responding
curl http://localhost:8080/healthz
curl http://localhost:8080/v1/accounts/bank-001
```

### Redis connection errors
```bash
# Verify Redis is accessible
redis-cli -h localhost -p 6379 ping

# Or via Docker
docker-compose exec redis redis-cli ping
```

### Jaeger tests fail
```bash
# Verify Jaeger UI is accessible
curl http://localhost:16686

# Check Jaeger logs
docker-compose logs jaeger
```

### Cache not clearing between tests
```bash
# Manually flush Redis
redis-cli -h localhost -p 6379 FLUSHALL

# Or restart Redis
docker-compose restart redis
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Start services
        run: docker-compose up -d

      - name: Wait for services
        run: |
          timeout 60 bash -c 'until curl -f http://localhost:8080/healthz; do sleep 2; done'

      - name: Run E2E tests
        working-directory: ./aqs-service
        run: |
          npm install
          npm run test:e2e

      - name: Cleanup
        if: always()
        run: docker-compose down -v
```

## Test Coverage

Current coverage:
- **Multi-Account Aggregation**: 7 test cases
- **Cache Behavior**: 9 test cases
- **Failure Scenarios**: 10 test cases
- **Trace Propagation**: 11 test cases

**Total**: 37 E2E test cases covering all critical paths

## Best Practices

1. **Clean state**: Each test clears Redis cache in `beforeEach`
2. **Isolation**: Tests reset backend simulation state in `afterEach`
3. **Serial execution**: Use `--runInBand` to avoid race conditions
4. **Timeouts**: Tests have 30s timeout for slow operations
5. **Assertions**: Use specific matchers (`toMatchObject`, `toHaveLength`)
6. **Error handling**: Always reset backend state after failure tests

## Future Enhancements

- [ ] Add performance benchmarks
- [ ] Test WebSocket connections (if implemented)
- [ ] Add security/authentication tests
- [ ] Test rate limiting behavior
- [ ] Add load testing scenarios
- [ ] Contract testing with Pact
