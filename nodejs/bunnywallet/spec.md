# BunnyWallet Detailed Specification

BunnyWallet is a multi-account financial dashboard application.

**Tech stack:** TypeScript (Node.js), Express for AQS, React + TypeScript + Tailwind + shadcn for frontend, Redis, OpenTelemetry, Prometheus/Grafana, Docker, Jest/Vitest, Pact for contract tests.

This spec is a runnable, demo-ready plan that you can implement end-to-end to showcase the Account Query Service architecture.

---

# 1 — High-level goals & demo story

**Goals**

* Demonstrate AQS adapter pattern: one backend per account type.
* Show canonical model aggregation, caching, resilience (timeouts, retries, circuit breakers), partial results, and telemetry.
* Provide a pleasant React dashboard exposing multiple account types and per-account status/latency.

**Demo flow**

1. Cold request (no cache) — show slow live backend calls.
2. Warm request — cache hits, fast.
3. Simulate backend outage — show circuit breaker, stale fallback, partial results.
4. Add a new backend adapter (e.g., Crypto), hot-swap, show minimal AQS change.

---

# 2 — System components & responsibilities

1. **API Gateway** — handle TLS, auth, rate limit. Use a simple reverse proxy (NGINX).
2. **Account Query Service (AQS)** — Node.js TypeScript service exposing HTTP endpoints. Core responsibilities:

   * Routing requests to adapters by account type.
   * Orchestration / fan-out for multi-account requests.
   * Canonical mapping to `AccountSummary`.
   * Cache (Redis) read-through + stale-while-revalidate.
   * Resilience primitives (per-adapter timeout, retries, circuit breaker, bulkhead).
   * Authorization checks (basic JWT scopes for demo).
   * Emit metrics & traces.
3. **Adapters** — one per account type (embedded as modules in AQS). Each adapter implements an interface and knows how to authenticate and call its backend. For demo: “bank”, “creditcard”, “loan”, “investments”, plus a “legacy” adapter that simulates slow / flaky behavior.
4. **Mock Backends** — small HTTP services (TypeScript/Express) that simulate different response shapes, latencies, error modes, auth requirements. Provide a UI to flip failure modes.
5. **Frontend Dashboard** — React app that:

   * Authenticates (demo token) and calls AQS endpoints.
   * Displays account cards, per-account load state, `lastUpdated`, `stale`, and backend source + latency.
   * Provides controls: refresh, toggle simulate backend failure, toggle cache TTL.
6. **Redis** — caching for account summaries.
7. **Observability** — OpenTelemetry tracing, Prometheus metrics exported by AQS & adapters, Grafana dashboard (demo metrics).
8. **CI** — basic pipeline to run unit tests, contract tests (Pact), and build images.

---

# 3 — Data models (canonical DTOs)

## AccountSummary (canonical)

```ts
type Currency = string; // "USD", "AUD"

interface Money {
  currency: Currency;
  available: number; // can be null for some backends
  ledger?: number;
}

interface Owner {
  name?: string;
  customerId?: string;
}

interface AccountSummary {
  accountId: string;
  accountType: 'bank' | 'creditcard' | 'loan' | 'investment' | 'legacy' | 'crypto';
  owner?: Owner;
  displayName?: string;
  balances?: Money[];
  status?: 'active' | 'suspended' | 'closed' | 'unknown';
  backendSource: string; // e.g. "bank-service-v1"
  lastUpdated?: string; // ISO 8601
  stale?: boolean; // true if served from stale cache
  metadata?: Record<string, any>; // backend-specific info kept here
}
```

## Multi-account response

```ts
interface AccountResult {
  accountId: string;
  status: 'ok' | 'not_found' | 'unavailable' | 'partial';
  data?: AccountSummary;
  error?: { code: string; message?: string };
  latencyMs?: number; // adapter call duration
}

interface MultiAccountResponse {
  requestId: string;
  overallStatus: 'ok' | 'partial' | 'error';
  results: AccountResult[];
}
```

---

# 4 — API (AQS) — endpoints & semantics

Use REST. Include request-id header support (`X-Request-Id`) and `Cache-Control`.

### `GET /v1/accounts/{accountId}`

* Returns 200 + AccountSummary on success.
* Returns 503 / `unavailable` details if backend unreachable and no cached data.
* Honor `Cache-Control: no-cache` to bypass cache.

### `GET /v1/accounts?ids=...` (comma-separated)

* Fan-out; supports `fields` projection param (optional).
* Returns 200 when all OK, 206 Partial Content when any account is partial/unavailable.
* Each result contains per-account status.

### `POST /v1/admin/backends/{backendName}/simulate`

(Demo-only) instruct a mock backend to go into `healthy|slow|error|flaky` mode. Protected (demo token).

### Auth

* Accept `Authorization: Bearer <token>` - for demo, static JWT signed with a dev private key; token contains `sub`, `scopes: ["accounts:read"]`.

---

# 5 — Adapter interface (TypeScript)

```ts
// src/adapters/adapter.ts
export type AdapterResult = {
  success: boolean;
  accountId: string;
  raw?: any;
  error?: { code: string; message: string };
  latencyMs?: number;
};

export interface AccountAdapter {
  accountType: string; // e.g., 'bank', 'creditcard'
  backendName: string;  // e.g., 'bank-service-v1'
  getSummary(accountId: string, opts?: { fields?: string[]; authToken?: string }): Promise<AdapterResult>;
  health?(): Promise<{ healthy: boolean; info?: any }>;
}
```

Adapters must:

* Use per-adapter timeout and retry strategy.
* Map backend responses to `AccountSummary` (or return raw for mapper to convert).
* Export a factory to be discovered by the AQS AdapterRegistry.

---

# 6 — Resilience patterns & implementation notes

**Libraries** (suggested):

* `p-retry` or custom for retries
* `cockatiel` or `opossum` for circuit-breaker and bulkhead
* `node-fetch` / `got` or axios for HTTP
* `ioredis` for Redis

**Per-adapter config**

* `timeoutMs` (e.g., 800 ms)
* `maxRetries` (e.g., 2)
* `circuitBreaker`: failureThreshold (e.g., 50% over rolling window), cooldown (e.g., 30s)
* `concurrencyLimit` (bulkhead) per adapter (e.g., 10)

**Fan-out orchestration**

* Limit total concurrency for multi-account requests (e.g., 50 in-flight adapter calls).
* Use `Promise.allSettled` and collect per-adapter outcomes and latencies.
* Overall request timeout (e.g., 2000 ms). If time runs out return partial results + `overallStatus: partial`.

**Fallbacks**

* If backend fails and cached value exists, return cached value with `stale: true`.
* If no cached value, return `unavailable` result for that account.

---

# 7 — Caching strategy

**Redis read-through cache**

* Key namespace: `aqs:account:{accountId}`
* Value: serialized `AccountSummary` + `cachedAt`
* TTL by account type: bank: 30s, creditcard: 60s, investment: 120s (configurable)
* Support `stale-while-revalidate`:

  * If TTL expired but `staleWindow` not exceeded (e.g., 5m), serve stale and kick off background refresh.
* Provide explicit invalidation via mock backend webhooks (demo: call `POST /v1/cache/invalidate/{accountId}`).

**Cache-control**

* Honor client `Cache-Control: no-cache` to force refresh.

---

# 8 — Observability & SLOs

**Metrics to emit (Prometheus)**

* `aqs_http_requests_total{route,method,code}`
* `aqs_request_latency_ms` histogram
* `adapter_calls_total{adapter,success}`
* `adapter_latency_ms{adapter}`
* `cache_hits_total`, `cache_misses_total`
* `circuit_breaker_state{adapter}` (0 closed, 1 open, 2 half-open)
* `accounts_partial_responses_total`

**Tracing**

* OpenTelemetry automatic instrumentation:

  * trace through AQS -> adapter -> backend
  * include tags: `accountId`, `accountType`, `backendName`, `requestId`

**Logs**

* Structured JSON with `requestId`, `traceId`, `accountId`, `accountType`, `backendName`, `latencyMs`, `status`.

**SLOs (demo)**

* 95% of single-account requests (cache hit) < 200ms.
* 99% of single-account requests (cache hit) < 500ms.
* Availability: 99% for aggregated requests (demo value).

---

# 9 — Mock backends (requirements)

Implement 5 mock backend services that differ in:

* Response shape (different JSON fields)
* Latency (configurable)
* Failure modes (HTTP 5xx, timeouts)
* Auth requirements (some require `X-API-Key`, others require OAuth bearer).
* One backend returns nested objects; one returns CSV/legacy format; one uses GraphQL endpoint.

Backends should expose admin endpoints to change mode:

* `POST /simulate` body `{ mode: 'healthy'|'slow'|'error'|'flaky', latencyMs?: number }`.

---

# 10 — Frontend dashboard spec

**Pages**

* Dashboard (default): shows a grid of AccountCards
* Account Details: show raw backend metadata, lastUpdated, transactions (if demo provides)
* Admin: controls to toggle mock backends and cache TTL (protected with demo token)

**AccountCard**

* fields: displayName, accountType badge, balances, status chip, backendSource, latency bar, lastUpdated, stale badge
* Visualize per-account call duration via small sparkline or colored pill
* Click to expand raw JSON (shows canonical + backend raw)

**Controls**

* Multi-refresh button (GET /v1/accounts?ids=...)
* Toggle per-account to simulate "no-cache" header

**UX**

* Show per-account spinner for live fetch, show partial successes with clear colors (green/orange/red)
* Show overall request ID and trace link (link opens a simple trace view that reads span logs from OTEL collector for demo)

---

# 11 — Security (demo-level)

* Use JWT with RS256 for user tokens (dev keypair in repo). Token scopes: `accounts:read`, `admin:simulate`.
* Validate tokens in AQS middleware.
* For adapters/backends, use demo API keys stored in env vars.

---

# 12 — Tests

**Unit tests**

* Adapter unit tests: map varied backend payloads to canonical model.
* Orchestrator: concurrency and timeout edge cases.

**Contract tests (Pact)**

* Each adapter defines a consumer-side contract. Mock backends run provider tests.

**Integration tests**

* Compose AQS + mock backends + Redis with docker-compose for CI smoke tests.

**End-to-end**

* Puppeteer or Cypress test to load frontend and run demo flows: cold->warm->failure.

**Chaos test (demo)**

* Simple script to toggle backend flaky modes and assert AQS returns partial + stale appropriately.

---

# 13 — CI/CD & local dev

**Local dev**

* `docker-compose.yml` bringing up:

  * Redis
  * AQS
  * 5 mock backends
  * Frontend (dev server)
  * Prometheus + Grafana (optional)
* `Makefile` or npm scripts:

  * `npm run dev:aqs`
  * `npm run dev:frontend`
  * `npm run mock:start`
  * `npm run test:unit`
  * `npm run test:contract`

**CI**

* Steps:

  1. Install & build
  2. Run unit tests
  3. Start mocks + redis via docker-compose
  4. Run integration tests
  5. Run pact contract verification
  6. Build docker images and push to registry (optional for demo)

---

# 14 — Deployment targets & manifests

**Dockerfiles**

* AQS Dockerfile: Node image, build TypeScript, expose 8080, health-check endpoint `/healthz`.
* Mock backends: small Node images.

---

# 15 — Repository layout (suggested)

```
/demo-aqs/
├─ /aqs-service/
│  ├─ src/
│  │  ├─ index.ts
│  │  ├─ server.ts
│  │  ├─ routes/
│  │  ├─ adapters/
│  │  │  ├─ bankAdapter.ts
│  │  │  ├─ creditAdapter.ts
│  │  │  └─ legacyAdapter.ts
│  │  ├─ orchestrator/
│  │  ├─ cache/
│  │  ├─ telemetry/
│  │  └─ types/
│  ├─ Dockerfile
│  └─ package.json
├─ /mock-backends/
│  ├─ bank-service/
│  ├─ credit-service/
│  └─ legacy-service/
├─ /frontend/
│  └─ react-app/
├─ docker-compose.yml
├─ scripts/
└─ README.md
```

---

# 16 — Example code snippets

## Adapter template (TypeScript)

```ts
// src/adapters/bankAdapter.ts
import fetch from 'node-fetch';
import { AccountAdapter, AdapterResult } from './adapter';
import { mapBankToCanonical } from '../mappers/bankMapper';
import { withResilience } from '../resilience';

export class BankAdapter implements AccountAdapter {
  accountType = 'bank';
  backendName = 'bank-service-v1';
  private baseUrl: string;
  constructor(baseUrl: string) { this.baseUrl = baseUrl; }

  async getSummary(accountId: string, opts?: any): Promise<AdapterResult> {
    const start = Date.now();
    const exec = async () => {
      const res = await fetch(`${this.baseUrl}/accounts/${accountId}`, {
        headers: { 'X-API-Key': process.env.BANK_API_KEY ?? '' },
        timeout: 700
      });
      if (!res.ok) throw new Error(`upstream:${res.status}`);
      const raw = await res.json();
      const mapped = mapBankToCanonical(raw);
      return { success: true, accountId, raw: mapped };
    };
    try {
      const rawResult = await withResilience(exec, { timeoutMs: 800, retries: 1, adapter: this.backendName });
      return { success: true, accountId, raw: rawResult, latencyMs: Date.now() - start };
    } catch (err: any) {
      return { success: false, accountId, error: { code: 'backend_error', message: err.message }, latencyMs: Date.now() - start };
    }
  }
}
```

## Orchestrator fan-out (simplified)

```ts
async function getAccounts(ids: string[], opts = {}) {
  const results = await Promise.allSettled(ids.map(async id => {
    const accountType = routeToAccountType(id);
    const adapter = registry.getAdapter(accountType);
    const cached = await cache.get(id);
    if (cached && !opts.forceRefresh) return { accountId: id, status: 'ok', data: cached, latencyMs: 5 };
    const res = await adapter.getSummary(id, opts);
    if (res.success) {
      const canonical = canonicalize(res.raw);
      await cache.set(id, canonical);
      return { accountId: id, status: 'ok', data: canonical, latencyMs: res.latencyMs };
    } else {
      if (cached) {
        cached.stale = true;
        return { accountId: id, status: 'unavailable', data: cached, error: res.error, latencyMs: res.latencyMs };
      }
      return { accountId: id, status: 'unavailable', error: res.error, latencyMs: res.latencyMs };
    }
  })));
  // convert settled to MultiAccountResponse
}
```

---

# 17 — Demo runbook (what to show, step-by-step)

1. Start `docker-compose up` (show terminal).
2. Open frontend — show default accounts (some cached, some live).
3. Click “Refresh” to show cold fetch for all accounts; open browser devtools or AQS logs to show adapter calls.
4. Toggle mock backend “loan” to `slow` — refresh → observe loan card shows spinner, then `unavailable` or stale, and circuit breaker tripping in Grafana.
5. Toggle mock backend to healthy again — show recovery (circuit half-open → closed).
6. Add new backend (crypto) code branch: implement adapter (10–15 lines) and register — hot-reload or restart AQS → new account type appears with no frontend change.
7. Show Prometheus/Grafana metrics: cache-hit ratio, per-adapter latency, request traces in Jaeger.
