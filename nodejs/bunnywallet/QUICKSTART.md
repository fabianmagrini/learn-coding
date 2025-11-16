# BunnyWallet Quick Start Guide

Get BunnyWallet up and running in 5 minutes!

## Prerequisites

- Docker & Docker Compose installed
- Node.js 20+ (for local development)

## Option 1: Docker (Fastest)

### 1. Start Everything

```bash
docker-compose up -d
```

This starts:
- Redis (cache)
- 5 Mock backend services
- AQS Service
- Prometheus (metrics)
- Grafana (visualization)

### 2. Generate an API Token

```bash
npm install jsonwebtoken  # If not already installed
node scripts/generate-token.js
```

Copy the **Admin Token** from the output.

### 3. Test the API

```bash
# Set your token (use the admin token from step 2)
export TOKEN="your-token-here"

# Get a single account
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/v1/accounts/BNK-001 | jq

# Get multiple accounts
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/v1/accounts?ids=BNK-001,CC-001,LOAN-001" | jq
```

### 4. Run the Demo

```bash
bash scripts/demo.sh
```

This will walk through:
- Single account queries
- Multi-account queries
- Backend simulation (slow, error modes)
- Cache invalidation

## Option 2: Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Redis

```bash
docker run -d --name bunnywallet-redis -p 6379:6379 redis:7-alpine
```

### 3. Start Mock Backends

Open 5 terminal windows and run:

```bash
# Terminal 1
cd mock-backends/bank-service && npm run dev

# Terminal 2
cd mock-backends/credit-service && npm run dev

# Terminal 3
cd mock-backends/loan-service && npm run dev

# Terminal 4
cd mock-backends/investment-service && npm run dev

# Terminal 5
cd mock-backends/legacy-service && npm run dev
```

### 4. Start AQS Service

```bash
npm run dev:aqs
```

### 5. Generate Token & Test

Same as Docker option (steps 2-4).

## Available Demo Accounts

| Type | Account IDs |
|------|------------|
| Bank | BNK-001, BNK-002 |
| Credit Card | CC-001, CC-002 |
| Loan | LOAN-001, LOAN-002 |
| Investment | INV-001, INV-002 |
| Legacy | LEG-001, LEG-002 |

## Key Endpoints

### Accounts
- `GET /v1/accounts/:accountId` - Get single account
- `GET /v1/accounts?ids=...` - Get multiple accounts

### Admin (requires admin token)
- `POST /v1/admin/backends/:backend/simulate` - Simulate backend failures
- `POST /v1/admin/cache/invalidate/:accountId` - Invalidate cache
- `GET /v1/admin/health` - Health check

### Observability
- `GET /metrics` - Prometheus metrics
- `GET /healthz` - Service health

## Quick Examples

### Cache Behavior

```bash
# First request (cache miss, ~100ms)
time curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/v1/accounts/BNK-001

# Second request (cache hit, <10ms)
time curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/v1/accounts/BNK-001

# Force refresh (bypass cache)
curl -H "Authorization: Bearer $TOKEN" \
  -H "Cache-Control: no-cache" \
  http://localhost:8080/v1/accounts/BNK-001
```

### Backend Simulation

```bash
# Make bank service slow (2 second delay)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"slow","latencyMs":2000}' \
  http://localhost:8080/v1/admin/backends/bank/simulate

# Test slow backend
time curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/v1/accounts/BNK-001

# Reset to healthy
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"healthy"}' \
  http://localhost:8080/v1/admin/backends/bank/simulate
```

### Partial Results

```bash
# Make one backend fail
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"error"}' \
  http://localhost:8080/v1/admin/backends/loan/simulate

# Request multiple accounts (returns 206 Partial Content)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/v1/accounts?ids=BNK-001,CC-001,LOAN-001" | jq
```

## Observability

### View Metrics

```bash
# Text format
curl http://localhost:8080/metrics

# Key metrics to watch
curl -s http://localhost:8080/metrics | grep -E "(aqs_request_latency|adapter_calls|cache_hits)"
```

### View in Grafana

1. Open http://localhost:3000
2. Login with admin/admin
3. Add Prometheus data source: http://prometheus:9090
4. Create dashboard with queries:
   - `rate(aqs_http_requests_total[5m])`
   - `histogram_quantile(0.95, rate(aqs_request_latency_ms_bucket[5m]))`
   - `rate(adapter_calls_total[5m])`
   - `cache_hits_total / (cache_hits_total + cache_misses_total)`

## Troubleshooting

### "Connection refused" errors

Make sure all services are running:
```bash
docker-compose ps  # For Docker setup
# or check individual services in terminal for local dev
```

### "Invalid token" errors

Generate a fresh token:
```bash
node scripts/generate-token.js
```

### Legacy service timeouts

Legacy service defaults to "slow" mode. Reset it:
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"healthy"}' \
  http://localhost:8080/v1/admin/backends/legacy/simulate
```

## Next Steps

- Read the full [README.md](./README.md) for architecture details
- Check out [spec.md](./spec.md) for the complete specification
- Explore the source code in `aqs-service/src/`
- Add custom adapters for new account types
- Build a frontend dashboard

## Cleanup

### Docker
```bash
docker-compose down -v  # Remove containers and volumes
```

### Local
```bash
docker stop bunnywallet-redis && docker rm bunnywallet-redis
# Ctrl+C in all terminal windows running services
```

Happy coding!
