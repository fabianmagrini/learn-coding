# Prometheus Metrics Guide

Comprehensive guide to monitoring Account Query Service (AQS) using Prometheus metrics.

## Overview

AQS exposes Prometheus-formatted metrics at the `/metrics` endpoint. These metrics provide deep observability into:

- HTTP request performance
- Backend adapter health and latency
- Cache hit rates and stale data usage
- Circuit breaker states
- Partial response patterns
- System health (Redis connectivity)

## Metrics Endpoint

```bash
# Access metrics endpoint
curl http://localhost:8080/metrics

# Example output
# HELP aqs_http_requests_total Total number of HTTP requests
# TYPE aqs_http_requests_total counter
aqs_http_requests_total{route="/v1/accounts/:accountId",method="GET",code="200"} 1523

# HELP adapter_latency_ms Adapter call latency in milliseconds
# TYPE adapter_latency_ms histogram
adapter_latency_ms_bucket{adapter="bank-service",le="50"} 450
adapter_latency_ms_bucket{adapter="bank-service",le="100"} 890
```

## Available Metrics

### HTTP Request Metrics

#### `aqs_http_requests_total`
**Type:** Counter
**Labels:** `route`, `method`, `code`
**Description:** Total number of HTTP requests handled by AQS

**Usage:**
```promql
# Request rate per route
rate(aqs_http_requests_total[5m])

# Success rate
sum(rate(aqs_http_requests_total{code=~"2.."}[5m])) /
sum(rate(aqs_http_requests_total[5m]))

# Error rate
rate(aqs_http_requests_total{code=~"5.."}[5m])
```

#### `aqs_request_latency_ms`
**Type:** Histogram
**Labels:** `route`, `method`, `code`
**Buckets:** `[10, 50, 100, 200, 500, 1000, 2000, 5000]`
**Description:** HTTP request latency in milliseconds

**Usage:**
```promql
# P95 latency
histogram_quantile(0.95,
  rate(aqs_request_latency_ms_bucket[5m])
)

# P99 latency
histogram_quantile(0.99,
  rate(aqs_request_latency_ms_bucket[5m])
)

# Average latency
rate(aqs_request_latency_ms_sum[5m]) /
rate(aqs_request_latency_ms_count[5m])
```

### Adapter Metrics

#### `adapter_calls_total`
**Type:** Counter
**Labels:** `adapter`, `success`
**Description:** Total number of backend adapter calls

**Usage:**
```promql
# Success rate per adapter
sum(rate(adapter_calls_total{success="true"}[5m])) by (adapter) /
sum(rate(adapter_calls_total[5m])) by (adapter)

# Failure rate
rate(adapter_calls_total{success="false"}[5m])

# Top failing adapters
topk(3,
  rate(adapter_calls_total{success="false"}[5m])
)
```

#### `adapter_latency_ms`
**Type:** Histogram
**Labels:** `adapter`
**Buckets:** `[10, 50, 100, 200, 500, 800, 1000, 1500, 2000, 5000]`
**Description:** Backend adapter call latency

**Usage:**
```promql
# P95 latency per adapter
histogram_quantile(0.95,
  rate(adapter_latency_ms_bucket[5m])
) by (adapter)

# Slowest adapters
topk(3,
  histogram_quantile(0.95, rate(adapter_latency_ms_bucket[5m])) by (adapter)
)
```

#### `adapter_timeouts_total`
**Type:** Counter
**Labels:** `adapter`
**Description:** Total number of adapter call timeouts

**Usage:**
```promql
# Timeout rate
rate(adapter_timeouts_total[5m])

# Timeout percentage
rate(adapter_timeouts_total[5m]) /
rate(adapter_calls_total[5m])
```

#### `adapter_retries_total`
**Type:** Counter
**Labels:** `adapter`
**Description:** Total number of adapter call retries

**Usage:**
```promql
# Retry rate
rate(adapter_retries_total[5m])

# Most retried adapters
topk(3, rate(adapter_retries_total[5m]))
```

### Cache Metrics

#### `cache_hits_total`
**Type:** Counter
**Labels:** `account_type`
**Description:** Total number of cache hits (fresh data)

**Usage:**
```promql
# Cache hit rate
sum(rate(cache_hits_total[5m])) /
(sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))

# Hit rate per account type
rate(cache_hits_total[5m]) by (account_type) /
(rate(cache_hits_total[5m]) + rate(cache_misses_total[5m])) by (account_type)
```

#### `cache_misses_total`
**Type:** Counter
**Labels:** `account_type`
**Description:** Total number of cache misses

**Usage:**
```promql
# Miss rate
rate(cache_misses_total[5m])

# Account types with most misses
topk(3, rate(cache_misses_total[5m]))
```

#### `cache_stale_total`
**Type:** Counter
**Labels:** `account_type`
**Description:** Total number of stale cache returns (stale-while-revalidate)

**Usage:**
```promql
# Stale response rate
rate(cache_stale_total[5m])

# Percentage of responses that are stale
sum(rate(cache_stale_total[5m])) /
sum(rate(aqs_http_requests_total{code="200"}[5m]))
```

### Circuit Breaker Metrics

#### `circuit_breaker_state`
**Type:** Gauge
**Labels:** `adapter`
**Values:** `0=closed`, `1=open`, `2=half-open`
**Description:** Circuit breaker state for each adapter

**Usage:**
```promql
# Open circuit breakers
circuit_breaker_state{state="1"}

# Alerts when circuit opens
circuit_breaker_state == 1

# Circuit breaker state over time
circuit_breaker_state by (adapter)
```

### Multi-Account Metrics

#### `accounts_partial_responses_total`
**Type:** Counter
**Description:** Total number of partial multi-account responses (HTTP 206)

**Usage:**
```promql
# Partial response rate
rate(accounts_partial_responses_total[5m])

# Percentage of multi-account requests that are partial
rate(accounts_partial_responses_total[5m]) /
rate(aqs_http_requests_total{route="/v1/accounts"}[5m])
```

### System Health Metrics

#### `redis_connection_status`
**Type:** Gauge
**Values:** `1=connected`, `0=disconnected`
**Description:** Redis connection health status

**Usage:**
```promql
# Alert when Redis disconnects
redis_connection_status == 0

# Redis uptime percentage
avg_over_time(redis_connection_status[24h])
```

#### `adapter_health_status`
**Type:** Gauge
**Labels:** `adapter`
**Values:** `1=healthy`, `0=unhealthy`
**Description:** Backend adapter health check status

**Usage:**
```promql
# Unhealthy adapters
adapter_health_status == 0

# Adapter availability over time
avg_over_time(adapter_health_status[1h]) by (adapter)
```

## Example Queries

### Performance Monitoring

```promql
# Overall request throughput
sum(rate(aqs_http_requests_total[5m]))

# P95 end-to-end latency
histogram_quantile(0.95,
  sum(rate(aqs_request_latency_ms_bucket[5m])) by (le)
)

# Slowest endpoints
topk(5,
  histogram_quantile(0.95,
    rate(aqs_request_latency_ms_bucket[5m])
  ) by (route)
)
```

### Error Monitoring

```promql
# Error rate percentage
sum(rate(aqs_http_requests_total{code=~"5.."}[5m])) /
sum(rate(aqs_http_requests_total[5m])) * 100

# Adapter failure rate
sum(rate(adapter_calls_total{success="false"}[5m])) by (adapter)

# Circuit breaker trip rate
changes(circuit_breaker_state[1h])
```

### Cache Effectiveness

```promql
# Cache efficiency
(sum(rate(cache_hits_total[5m])) + sum(rate(cache_stale_total[5m]))) /
(sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m]))) * 100

# Stale-while-revalidate usage
sum(rate(cache_stale_total[5m])) /
sum(rate(aqs_http_requests_total{code="200"}[5m])) * 100
```

### System Health

```promql
# Overall system health (all green)
redis_connection_status == 1
and min(adapter_health_status) == 1
and max(circuit_breaker_state) == 0

# Adapter availability (last hour)
avg_over_time(adapter_health_status[1h]) by (adapter)
```

## Grafana Dashboard

### Recommended Panels

1. **Request Rate**
   - Query: `sum(rate(aqs_http_requests_total[5m]))`
   - Type: Graph
   - Unit: requests/sec

2. **Latency Percentiles**
   - Query: P50, P95, P99 of `aqs_request_latency_ms`
   - Type: Graph
   - Unit: milliseconds

3. **Cache Hit Rate**
   - Query: Cache hit ratio formula
   - Type: Stat
   - Unit: percentage

4. **Adapter Health**
   - Query: `adapter_health_status`
   - Type: Stat panel (one per adapter)
   - Thresholds: Red if 0, Green if 1

5. **Circuit Breaker Status**
   - Query: `circuit_breaker_state`
   - Type: Table
   - Value mapping: 0=Closed, 1=Open, 2=Half-Open

6. **Error Rate**
   - Query: Error rate percentage
   - Type: Graph with threshold
   - Alert: If > 5%

7. **Stale Cache Usage**
   - Query: `rate(cache_stale_total[5m])`
   - Type: Graph
   - Shows resilience pattern effectiveness

### Dashboard Import

```json
{
  "dashboard": {
    "title": "AQS Observability",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "sum(rate(aqs_http_requests_total[5m]))"
          }
        ]
      }
    ]
  }
}
```

## Alerting Rules

### Prometheus Alert Rules

```yaml
groups:
  - name: aqs_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(aqs_http_requests_total{code=~"5.."}[5m])) /
          sum(rate(aqs_http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95,
            rate(aqs_request_latency_ms_bucket[5m])
          ) > 2000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High P95 latency"
          description: "P95 latency is {{ $value }}ms"

      - alert: AdapterDown
        expr: adapter_health_status == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Adapter {{ $labels.adapter }} is down"

      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state == 1
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Circuit breaker opened for {{ $labels.adapter }}"

      - alert: RedisDisconnected
        expr: redis_connection_status == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis connection lost"

      - alert: LowCacheHitRate
        expr: |
          sum(rate(cache_hits_total[5m])) /
          (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m]))) < 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Cache hit rate below 50%"
          description: "Current hit rate: {{ $value | humanizePercentage }}"

      - alert: HighPartialResponses
        expr: |
          rate(accounts_partial_responses_total[5m]) /
          rate(aqs_http_requests_total{route="/v1/accounts"}[5m]) > 0.2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High rate of partial responses"
          description: "{{ $value | humanizePercentage }} of multi-account requests are partial"
```

## Integration with Prometheus

### Prometheus Configuration

Add AQS to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'aqs-service'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/metrics'
```

### Running with Docker Compose

```yaml
version: '3.8'
services:
  aqs:
    image: aqs-service:latest
    ports:
      - "8080:8080"

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
```

### Verify Scraping

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Query metrics
curl 'http://localhost:9090/api/v1/query?query=aqs_http_requests_total'
```

## Best Practices

### 1. Use Rate for Counters

Always use `rate()` or `increase()` with counter metrics:

```promql
# Good
rate(aqs_http_requests_total[5m])

# Bad
aqs_http_requests_total
```

### 2. Choose Appropriate Time Windows

- Short-term monitoring: `[1m]` or `[5m]`
- Medium-term analysis: `[1h]`
- Long-term trends: `[24h]`

### 3. Use Recording Rules for Complex Queries

Pre-compute expensive queries:

```yaml
groups:
  - name: aqs_recording_rules
    interval: 30s
    rules:
      - record: aqs:request_rate:5m
        expr: sum(rate(aqs_http_requests_total[5m]))

      - record: aqs:error_rate:5m
        expr: |
          sum(rate(aqs_http_requests_total{code=~"5.."}[5m])) /
          sum(rate(aqs_http_requests_total[5m]))
```

### 4. Label Cardinality

Avoid high-cardinality labels (e.g., user IDs, timestamps). Current labels are properly scoped:
- `adapter` - 6 values
- `account_type` - 6 values
- `route` - ~5 values
- `method` - 4 values
- `code` - ~10 values

### 5. Retention and Storage

Plan for metric retention based on resolution:
- High resolution (15s): 15 days
- Medium resolution (1m): 60 days
- Low resolution (5m): 1 year

## Troubleshooting

### Metrics Not Appearing

```bash
# Check if endpoint is accessible
curl http://localhost:8080/metrics

# Verify Prometheus config
docker exec prometheus promtool check config /etc/prometheus/prometheus.yml

# Check Prometheus logs
docker logs prometheus
```

### Missing Labels

Ensure metrics are recorded with all required labels:

```typescript
// Correct
recordAdapterCall('bank-service', true, 150);

// Missing adapter name - will fail
recordAdapterCall('', true, 150);
```

### High Cardinality Warnings

If you see warnings about high cardinality:
- Review label values
- Avoid dynamic labels (requestId, traceId, etc.)
- Use attributes in traces instead

## Resources

- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
- [prom-client Documentation](https://github.com/siimon/prom-client)

## Future Enhancements

- [ ] Add SLO/SLI dashboards (99.9% availability, P95 < 500ms)
- [ ] Implement metric federation for multi-region deployments
- [ ] Add custom business metrics (accounts per user, etc.)
- [ ] Integrate with PagerDuty/Opsgenie for alerts
- [ ] Add cost metrics (adapter call costs)
