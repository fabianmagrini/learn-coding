# Claude Development Context

This file contains important context and commands for Claude Code when working on the Argos project.

## Project Overview

Argos is a production-grade 12-factor Node.js microservices application demonstrating modern architectural patterns with full observability. The project consists of two TypeScript services with comprehensive testing, monitoring, and containerization.

## Architecture

- **products-service** (Port 3001): Product catalog management with in-memory storage
- **orders-service** (Port 3002): Order creation service that validates products via HTTP calls
- **Infrastructure**: Jaeger (tracing), Prometheus (metrics), Grafana (visualization)

## Development Commands

### Testing
```bash
# Test products service
cd products-service && npm test

# Test orders service  
cd orders-service && npm test

# Run all tests with coverage
npm test -- --coverage
```

### Building and Running
```bash
# Build and start all services
docker-compose build
docker-compose up

# Run individual service in development
cd products-service && npm run dev
cd orders-service && npm run dev

# Build TypeScript
npm run build

# Start production build
npm start
```

### Linting and Type Checking
```bash
# TypeScript compilation check
npm run build

# Note: No explicit lint command configured
# Consider adding: npm run lint, npm run typecheck
```

## Service Dependencies

### Products Service
- express: Web framework
- pino: Structured logging
- prom-client: Prometheus metrics
- @opentelemetry/*: Distributed tracing
- jest, supertest: Testing

### Orders Service
- All products-service dependencies plus:
- axios: HTTP client for products service calls
- nock: HTTP mocking for tests

## Key Implementation Details

### Observability
- **Tracing**: OpenTelemetry with Jaeger backend (http://jaeger:4318/v1/traces)
- **Logging**: Structured JSON logs with Pino, pretty printing in development
- **Metrics**: Prometheus metrics exposed at /metrics endpoints

### Health Checks
- Both services expose `/healthz` endpoints returning "OK"
- Docker health checks configured for container monitoring

### Error Handling
- Products service: 404 for non-existent products
- Orders service: 400 for invalid requests, 500 for service errors
- Graceful shutdown on SIGTERM/SIGINT signals

### Security
- Non-root container users (appuser:1001)
- Multi-stage Docker builds
- Input validation and error boundaries

## Testing Strategy

- **Unit tests**: Service logic and endpoint behavior
- **Integration tests**: Full HTTP request/response cycles
- **Mocking**: External dependencies (logger, tracing, HTTP calls)
- **Coverage**: Excludes tracing setup and test files

## Docker Configuration

- **Base image**: node:18-alpine
- **Multi-stage**: Build stage + production stage
- **Health checks**: Native Docker health check commands
- **Networks**: Default bridge network for service communication

## Environment Variables

### Common
- `NODE_ENV`: production/development
- `LOG_LEVEL`: info/debug/warn/error
- `JAEGER_ENDPOINT`: Tracing collector URL

### Service Specific
- `PORT`: Service port (3001/3002)
- `PRODUCTS_SERVICE_URL`: Orders service dependency

## Common Issues and Solutions

### Port Conflicts
```bash
lsof -i :3001
lsof -i :3002
```

### Service Communication
```bash
# Test connectivity
docker-compose exec orders-service ping products-service
```

### Logs and Debugging
```bash
# View service logs
docker-compose logs products-service
docker-compose logs orders-service

# Follow logs
docker-compose logs -f
```

## File Structure Context

```
argos/
├── products-service/          # Product management microservice
│   ├── src/
│   │   ├── index.ts          # Main Express app with API endpoints
│   │   ├── logger.ts         # Pino logging configuration
│   │   ├── tracing.ts        # OpenTelemetry setup
│   │   ├── index.test.ts     # Jest integration tests
│   │   └── test-setup.ts     # Test mocks and configuration
│   ├── Dockerfile            # Multi-stage container build
│   ├── jest.config.js        # Test configuration
│   ├── package.json          # Dependencies and scripts
│   └── tsconfig.json         # TypeScript configuration
├── orders-service/           # Same structure as products-service
├── grafana/provisioning/     # Grafana auto-configuration
├── docker-compose.yml        # Full stack orchestration
├── prometheus.yml            # Metrics scraping configuration
├── README.md                 # Comprehensive documentation
└── CLAUDE.md                 # This file
```

## Development Workflow

1. **Code changes**: Edit TypeScript files in src/
2. **Testing**: Run `npm test` before commits
3. **Building**: Use `npm run build` to verify TypeScript compilation
4. **Integration**: Test with `docker-compose up` for full stack
5. **Verification**: Check health endpoints and observability tools

## Best Practices Reminder

- Follow 12-factor app principles
- Maintain structured logging
- Write comprehensive tests
- Use environment variables for configuration
- Implement graceful shutdown handlers
- Monitor service health and metrics