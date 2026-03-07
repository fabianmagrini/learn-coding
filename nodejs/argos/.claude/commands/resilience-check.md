Audit the Argos project for resilience coverage by checking code and configuration files. Do not run any commands — this is a static analysis only.

## Services to check

Check both `products-service` and `orders-service` unless a specific service is named in the request.

## Checks to perform

### 1. Graceful shutdown (per service)

- `process.on('SIGTERM', ...)` handler is registered in `src/index.ts`
- `process.on('SIGINT', ...)` handler is registered in `src/index.ts`
- `server.close()` is called inside the shutdown handler before `process.exit()`
- `shutdownTracing()` is awaited inside the shutdown handler
- No `process.exit()` calls exist outside the shutdown handler

### 2. HTTP client resilience (orders-service only)

- `timeout` is set on all axios calls — note the value if present
- A retry library is in `package.json` dependencies (e.g. `axios-retry`, `p-retry`, `retry`)
- A circuit breaker library is in `package.json` dependencies (e.g. `opossum`, `cockatiel`, `brakes`)
- If retry or circuit breaker libraries are absent, flag this as a gap

### 3. Input validation (per service)

- Required fields are checked before processing in route handlers
- Type validation is performed on inputs
- Range or bounds checks are present for numeric inputs (e.g. quantity > 0)
- Invalid inputs return 400 status codes, not 500

### 4. Error handling (per service)

- All `async` route handlers are wrapped in `try/catch`
- Errors from downstream services are caught separately from unexpected errors
- Known error cases (e.g. 404 from a dependency) return appropriate status codes rather than leaking as 500
- Error responses do not expose internal stack traces or sensitive details

### 5. Health endpoints (per service)

- `/healthz` endpoint is registered in `src/index.ts`
- Docker `healthcheck` block is present for the service in `docker-compose.yml`
- Flag if there is no separate `/readyz` readiness endpoint (liveness and readiness are distinct concerns for Kubernetes-style deployments)

### 6. Resource limits

- `docker-compose.yml` has a `deploy.resources.limits` block for each service specifying CPU and memory constraints
- Flag if resource limits are absent

### 7. README vs code consistency

Check `README.md` for resilience claims and verify each against the actual code:

- *"Retry logic — Built into HTTP client configuration"*: confirm a retry library or retry logic is present in `orders-service/package.json` or `src/index.ts`
- *"Circuit breaker behavior — Timeout handling for HTTP calls"*: confirm a circuit breaker library is present, not just an axios timeout; flag if the README overstates what is implemented

## Output format

Report results as a checklist grouped by section. Use:
- ✅ for passing checks
- ❌ for failing checks, with the specific file and line or missing element
- ⚠️ for partial findings (e.g. timeout present but no retry library)

End with a **Summary** listing gaps in priority order:
1. Missing implementation that README claims exists (documentation drift)
2. Missing resilience patterns with no code or config coverage
3. Partial implementations worth strengthening
