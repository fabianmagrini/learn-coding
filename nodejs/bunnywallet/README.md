# BunnyWallet - Multi-Account Financial Dashboard

BunnyWallet is a demonstration of the **Account Query Service (AQS)** architecture pattern, showcasing how to build a resilient, scalable service for aggregating financial account data from multiple backend systems.

## Features

- **Adapter Pattern**: Pluggable adapters for different account types (Bank, Credit Card, Loan, Investment, Legacy)
- **Resilience**: Circuit breakers, retries, timeouts, and bulkheads per adapter
- **Caching**: Redis-based caching with stale-while-revalidate strategy
- **Partial Results**: Returns available data even when some backends fail
- **Observability**: Prometheus metrics, structured logging, request tracing
- **Mock Backends**: 5 configurable mock services with simulation modes (healthy, slow, error, flaky)

## Architecture

### Full System Architecture (with NGINX Gateway)

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ HTTPS (443)
                            ▼
                  ┌──────────────────┐
                  │  NGINX Gateway   │
                  │  - TLS Termination│
                  │  - Rate Limiting │
                  │  - Load Balancing│
                  │  - Security      │
                  └────────┬─────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
    ┌────────┐    ┌────────────────┐   ┌──────────┐
    │Frontend│    │  AQS Service   │   │Prometheus│
    │(React) │    │                │   │ Grafana  │
    └────────┘    └───────┬────────┘   └──────────┘
                          │
                  ┌───────┴───────┐
                  │               │
                  ▼               ▼
            ┌─────────┐    ┌──────────┐
            │ Cache   │    │ Adapters │
            │ (Redis) │    │ Registry │
            └─────────┘    └─────┬────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
                ┌─────┐      ┌─────┐     ┌─────┐
                │Bank │      │Card │ ... │ Leg │
                └─────┘      └─────┘     └─────┘
```

### Core AQS Service Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│         AQS Service                 │
│  ┌─────────────────────────────┐   │
│  │     Orchestrator            │   │
│  └─────────────────────────────┘   │
│  ┌─────────┐  ┌─────────┐          │
│  │ Cache   │  │ Adapters│          │
│  │ (Redis) │  │ Registry│          │
│  └─────────┘  └─────────┘          │
└───────────┬─┬───┬───┬───┬──────────┘
            │ │   │   │   │
     ┌──────┘ │   │   │   └──────┐
     ▼        ▼   ▼   ▼          ▼
  ┌────┐  ┌────┐┌────┐┌────┐  ┌────┐
  │Bank│  │Card││Loan││Inv │  │Leg │
  └────┘  └────┘└────┘└────┘  └────┘
```

## Tech Stack

### Backend
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express
- **Cache**: Redis
- **Resilience**: Cockatiel (circuit breaker, retry, timeout)
- **Observability**: Prometheus, Winston logging
- **Testing**: Jest, Pact (contract tests)

### Infrastructure
- **API Gateway**: NGINX (TLS termination, rate limiting, load balancing)
- **Containers**: Docker & Docker Compose
- **Metrics**: Prometheus + Grafana (optional)

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Docker & Docker Compose (for containerized setup)

### Option 1: Docker Compose (Recommended)

1. **Clone and navigate to the project**:
   ```bash
   cd BunnyWallet
   ```

2. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

3. **Generate SSL certificates** (one-time setup):
   ```bash
   cd nginx && ./generate-certs.sh && cd ..
   ```

4. **Start all services**:
   ```bash
   docker-compose up -d
   ```

5. **Verify services are running**:
   ```bash
   docker-compose ps
   ```

6. **Access the services** (via NGINX Gateway):
   - **Frontend**: https://localhost (⚠️ accept self-signed cert warning)
   - **AQS API**: https://localhost/v1/accounts
   - **Health Check**: http://localhost:8081/nginx-health
   - **Prometheus**: https://localhost:9090 (IP restricted)
   - **Grafana**: https://localhost:3001 (admin/admin, IP restricted)

   **Note:** For direct backend access (development only):
   - AQS API (direct): http://localhost:8080
   - Prometheus (direct): http://localhost:9090
   - Grafana (direct): http://localhost:3000

### Option 2: Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start Redis** (requires Docker):
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

3. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Start mock backends** (in separate terminals):
   ```bash
   cd mock-backends/bank-service && npm run dev
   cd mock-backends/credit-service && npm run dev
   cd mock-backends/loan-service && npm run dev
   cd mock-backends/investment-service && npm run dev
   cd mock-backends/legacy-service && npm run dev
   ```

5. **Start AQS service**:
   ```bash
   npm run dev:aqs
   ```

## API Usage

### Authentication

All API requests require a JWT bearer token. For demo purposes, you can generate a token:

```bash
# Example using Node.js REPL
node
> const jwt = require('jsonwebtoken');
> const token = jwt.sign({ sub: 'demo-user', scopes: ['accounts:read', 'admin:simulate', 'admin:cache'] }, 'dev-secret-key-change-in-production', { expiresIn: '24h' });
> console.log(token);
```

### Get Single Account

**Via NGINX Gateway (HTTPS):**
```bash
curl -k -H "Authorization: Bearer YOUR_TOKEN" \
  https://localhost/v1/accounts/BNK-001
```

**Direct to AQS (development only):**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/v1/accounts/BNK-001
```

Response:
```json
{
  "accountId": "BNK-001",
  "accountType": "bank",
  "displayName": "Primary Checking Account",
  "owner": {
    "customerId": "CUST-12345",
    "name": "John Doe"
  },
  "balances": [
    {
      "currency": "USD",
      "available": 5420.50,
      "ledger": 5620.50
    }
  ],
  "status": "active",
  "backendSource": "bank-service-v1"
}
```

### Get Multiple Accounts

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8080/v1/accounts?ids=BNK-001,CC-001,LOAN-001"
```

### Force Cache Bypass

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Cache-Control: no-cache" \
  http://localhost:8080/v1/accounts/BNK-001
```

### Simulate Backend Failures

```bash
# Make loan service slow (2000ms latency)
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"slow","latencyMs":2000}' \
  http://localhost:8080/v1/admin/backends/loan/simulate

# Make bank service return errors
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"error"}' \
  http://localhost:8080/v1/admin/backends/bank/simulate

# Reset to healthy
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"healthy"}' \
  http://localhost:8080/v1/admin/backends/bank/simulate
```

### Invalidate Cache

```bash
# Invalidate specific account
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/v1/admin/cache/invalidate/BNK-001

# Invalidate all cache
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/v1/admin/cache/invalidate-all
```

## Demo Account IDs

- **Bank**: BNK-001, BNK-002
- **Credit Card**: CC-001, CC-002
- **Loan**: LOAN-001, LOAN-002
- **Investment**: INV-001, INV-002
- **Legacy**: LEG-001, LEG-002

## Observability

### Prometheus Metrics

Access metrics at: http://localhost:8080/metrics

Key metrics:
- `aqs_http_requests_total` - Total HTTP requests
- `aqs_request_latency_ms` - Request latency histogram
- `adapter_calls_total` - Adapter call counts
- `adapter_latency_ms` - Adapter latency
- `cache_hits_total` / `cache_misses_total` - Cache performance
- `circuit_breaker_state` - Circuit breaker state per adapter

### Logs

AQS uses structured JSON logging with Winston. Logs include:
- `requestId` - Unique request identifier
- `accountId` - Account being queried
- `latencyMs` - Operation duration
- `accountType` - Type of account
- `backendName` - Backend service name

## Demo Runbook

### Scenario 1: Cold vs Warm Requests

1. Make a fresh request (cache miss):
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8080/v1/accounts/BNK-001
   ```
   Note the latency (should be ~50-200ms).

2. Make the same request again (cache hit):
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8080/v1/accounts/BNK-001
   ```
   Note the latency (should be <10ms).

### Scenario 2: Backend Failure with Stale Fallback

1. Get an account to populate cache:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8080/v1/accounts/LOAN-001
   ```

2. Make the loan backend return errors:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"mode":"error"}' \
     http://localhost:8080/v1/admin/backends/loan/simulate
   ```

3. Request the account with force refresh:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Cache-Control: no-cache" \
     http://localhost:8080/v1/accounts/LOAN-001
   ```

   Should return stale cached data with `"stale": true`.

### Scenario 3: Partial Results

1. Make bank service slow:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"mode":"slow","latencyMs":5000}' \
     http://localhost:8080/v1/admin/backends/bank/simulate
   ```

2. Request multiple accounts:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Cache-Control: no-cache" \
     "http://localhost:8080/v1/accounts?ids=BNK-001,CC-001,LOAN-001"
   ```

   Should return 206 Partial Content with available accounts.

## Project Structure

```
BunnyWallet/
├── nginx/                     # NGINX API Gateway
│   ├── nginx.conf             # Main NGINX configuration
│   ├── conf.d/                # Server blocks and routing
│   ├── certs/                 # SSL certificates
│   ├── generate-certs.sh      # Certificate generation script
│   ├── test-nginx.sh          # Integration test suite
│   ├── Dockerfile             # NGINX Docker image
│   └── README.md              # NGINX documentation
├── aqs-service/               # Main AQS service
│   ├── src/
│   │   ├── adapters/          # Account type adapters
│   │   ├── cache/             # Redis cache layer
│   │   ├── mappers/           # Backend→Canonical mappers
│   │   ├── middleware/        # Auth, metrics, request ID
│   │   ├── orchestrator/      # Multi-account orchestration
│   │   ├── resilience/        # Circuit breaker, retry, timeout
│   │   ├── routes/            # Express routes
│   │   ├── telemetry/         # Logging & metrics
│   │   ├── types/             # TypeScript types
│   │   ├── server.ts          # Express app setup
│   │   └── index.ts           # Entry point
│   ├── Dockerfile
│   └── package.json
├── mock-backends/             # Mock backend services
│   ├── bank-service/
│   ├── credit-service/
│   ├── loan-service/
│   ├── investment-service/
│   └── legacy-service/
├── docker-compose.yml         # Orchestration
├── prometheus.yml             # Prometheus config
└── README.md                  # This file
```

## Development

### Running Tests

```bash
# Unit tests
npm run test:unit

# Contract tests (Pact)
npm run test:contract

# Integration tests
npm run test:integration
```

### Adding a New Adapter

1. Create mapper in `aqs-service/src/mappers/`:
   ```typescript
   export function mapNewBackendToCanonical(raw: any): AccountSummary {
     // Transform logic
   }
   ```

2. Create adapter in `aqs-service/src/adapters/`:
   ```typescript
   export class NewAdapter implements AccountAdapter {
     accountType = 'new' as const;
     backendName = 'new-service-v1';
     // Implement getSummary()
   }
   ```

3. Register in `aqs-service/src/server.ts`:
   ```typescript
   registry.register(new NewAdapter());
   ```

## Troubleshooting

### Redis Connection Error

If you see "Redis connection error":
- Ensure Redis is running: `docker ps | grep redis`
- Check Redis connection in .env or docker-compose.yml

### 401 Unauthorized

Ensure you're passing a valid JWT token with the required scopes:
- `accounts:read` - Required for account queries
- `admin:simulate` - Required for backend simulation
- `admin:cache` - Required for cache operations

### Backend Timeouts

Check simulation mode of backends. Legacy service defaults to "slow" mode.
Reset to healthy:
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"healthy"}' \
  http://localhost:8080/v1/admin/backends/legacy/simulate
```

### NGINX Gateway Issues

See comprehensive troubleshooting in [`nginx/README.md`](nginx/README.md):
- Certificate warnings (expected with self-signed certs)
- 502 Bad Gateway (backend not running)
- 429 Rate Limit (exceeded request threshold)
- Configuration changes not applied

**Quick checks:**
```bash
# NGINX health
curl http://localhost:8081/nginx-health

# NGINX status
curl http://localhost:8081/nginx-status

# Test configuration
docker exec bunnywallet-nginx nginx -t

# View logs
docker logs bunnywallet-nginx
```

## NGINX API Gateway

BunnyWallet includes a production-grade NGINX API Gateway with:

- **TLS/HTTPS Termination** - All traffic uses HTTPS (HTTP auto-redirects)
- **Rate Limiting** - API (100/s), Admin (10/s), Metrics (30/s)
- **Load Balancing** - Least connections algorithm with health checks
- **Security Headers** - HSTS, X-Frame-Options, CSP, XSS protection
- **IP Whitelisting** - Admin and metrics endpoints restricted
- **Performance** - Gzip compression, HTTP/2, caching

### Quick NGINX Commands

```bash
# Generate certificates (one-time)
cd nginx && ./generate-certs.sh

# Test NGINX configuration
docker exec bunnywallet-nginx nginx -t

# Reload configuration (zero downtime)
docker exec bunnywallet-nginx nginx -s reload

# Run integration tests
./nginx/test-nginx.sh

# View NGINX status
curl http://localhost:8081/nginx-status
```

### Documentation

- **[nginx/README.md](nginx/README.md)** - Comprehensive NGINX guide (650+ lines)
- **[nginx/QUICK_REFERENCE.md](nginx/QUICK_REFERENCE.md)** - Command cheat sheet
- **[NGINX_IMPLEMENTATION.md](NGINX_IMPLEMENTATION.md)** - Implementation summary

## License

MIT
