Audit the Argos project for observability coverage by checking code and configuration files. Do not run any commands — this is a static analysis only.

## Services to check

Check both `products-service` and `orders-service` unless a specific service is named in the request.

## Checks to perform

### 1. Tracing (per service)

- `src/tracing.ts` exists
- `tracing.ts` is imported at the **top** of `src/index.ts`, before other imports (critical: must initialise before Express and other instrumentation)
- `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, and `@opentelemetry/exporter-trace-otlp-http` are in `package.json` dependencies
- `JAEGER_ENDPOINT` environment variable is referenced in `tracing.ts`

### 2. Structured logging (per service)

- `src/logger.ts` exists and uses `pino`
- `pino` is in `package.json` dependencies
- `src/index.ts` imports and uses the logger (not `console.log`)
- Grep `src/index.ts` for any `console.log` or `console.error` calls that bypass the logger

### 3. Metrics (per service)

- `prom-client` is in `package.json` dependencies
- `/metrics` endpoint is registered in `src/index.ts`
- At least one custom metric (counter or histogram) is created beyond the default metrics

### 4. Health endpoint (per service)

- `/healthz` endpoint is registered in `src/index.ts` and returns a 200 response

### 5. Docker configuration

- `docker-compose.yml`: each service has a `healthcheck` block
- `docker-compose.yml`: each service has `JAEGER_ENDPOINT` set in its `environment` block
- Jaeger service is defined with OTLP ports (4317, 4318)
- Prometheus service is defined
- Grafana service is defined

### 6. Prometheus scraping

- `prometheus.yml` has a scrape job for each service targeting `/metrics`
- Each scrape job's target host matches the service name in `docker-compose.yml`

### 7. Grafana provisioning

- `grafana/provisioning/datasources/` contains a datasource file
- The datasource points to the Prometheus service URL

## Output format

Report results as a checklist grouped by section. Use:
- ✅ for passing checks
- ❌ for failing checks, with the specific file and line or missing element
- ⚠️ for partial or uncertain findings

End with a **Summary** listing any gaps that need attention.
