import { Registry, Counter, Histogram, Gauge } from 'prom-client';

// Create a Registry
export const register = new Registry();

// HTTP request metrics
export const httpRequestsTotal = new Counter({
  name: 'aqs_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['route', 'method', 'code'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'aqs_request_latency_ms',
  help: 'HTTP request latency in milliseconds',
  labelNames: ['route', 'method', 'code'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
  registers: [register],
});

// Adapter metrics
export const adapterCallsTotal = new Counter({
  name: 'adapter_calls_total',
  help: 'Total number of adapter calls',
  labelNames: ['adapter', 'success'],
  registers: [register],
});

export const adapterLatency = new Histogram({
  name: 'adapter_latency_ms',
  help: 'Adapter call latency in milliseconds',
  labelNames: ['adapter'],
  buckets: [10, 50, 100, 200, 500, 800, 1000, 1500, 2000, 5000],
  registers: [register],
});

// Cache metrics
export const cacheHitsTotal = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['account_type'],
  registers: [register],
});

export const cacheMissesTotal = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['account_type'],
  registers: [register],
});

export const cacheStaleTotal = new Counter({
  name: 'cache_stale_total',
  help: 'Total number of stale cache returns',
  labelNames: ['account_type'],
  registers: [register],
});

// Circuit breaker metrics
export const circuitBreakerState = new Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
  labelNames: ['adapter'],
  registers: [register],
});

// Partial response metrics
export const partialResponsesTotal = new Counter({
  name: 'accounts_partial_responses_total',
  help: 'Total number of partial multi-account responses',
  registers: [register],
});

// System health metrics
export const redisConnectionStatus = new Gauge({
  name: 'redis_connection_status',
  help: 'Redis connection status (1=connected, 0=disconnected)',
  registers: [register],
});

export const adapterHealthStatus = new Gauge({
  name: 'adapter_health_status',
  help: 'Adapter health status (1=healthy, 0=unhealthy)',
  labelNames: ['adapter'],
  registers: [register],
});

// Timeout metrics
export const timeoutsTotal = new Counter({
  name: 'adapter_timeouts_total',
  help: 'Total number of adapter call timeouts',
  labelNames: ['adapter'],
  registers: [register],
});

// Retry metrics
export const retriesTotal = new Counter({
  name: 'adapter_retries_total',
  help: 'Total number of adapter call retries',
  labelNames: ['adapter'],
  registers: [register],
});

// Helper functions to record metrics
export function recordHttpRequest(
  route: string,
  method: string,
  statusCode: number,
  durationMs: number
) {
  httpRequestsTotal.labels(route, method, statusCode.toString()).inc();
  httpRequestDuration.labels(route, method, statusCode.toString()).observe(durationMs);
}

export function recordAdapterCall(
  adapter: string,
  success: boolean,
  latencyMs: number
) {
  adapterCallsTotal.labels(adapter, success.toString()).inc();
  adapterLatency.labels(adapter).observe(latencyMs);
}

export function recordCacheHit(accountType: string) {
  cacheHitsTotal.labels(accountType).inc();
}

export function recordCacheMiss(accountType: string) {
  cacheMissesTotal.labels(accountType).inc();
}

export function recordCacheStale(accountType: string) {
  cacheStaleTotal.labels(accountType).inc();
}

export function recordCircuitBreakerState(adapter: string, state: 0 | 1 | 2) {
  circuitBreakerState.labels(adapter).set(state);
}

export function recordPartialResponse() {
  partialResponsesTotal.inc();
}

export function recordRedisConnection(connected: boolean) {
  redisConnectionStatus.set(connected ? 1 : 0);
}

export function recordAdapterHealth(adapter: string, healthy: boolean) {
  adapterHealthStatus.labels(adapter).set(healthy ? 1 : 0);
}

export function recordTimeout(adapter: string) {
  timeoutsTotal.labels(adapter).inc();
}

export function recordRetry(adapter: string) {
  retriesTotal.labels(adapter).inc();
}
