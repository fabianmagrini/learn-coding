# Argos - Production-Grade 12-Factor Node.js Microservices

A comprehensive example of a production-ready microservices architecture built with Node.js and TypeScript, demonstrating the [Twelve-Factor App](https://12factor.net/) methodology with full observability, resilience patterns, and containerization.

## 🏗️ Architecture Overview

Argos consists of two microservices with complete observability infrastructure:

```
┌───────────────--──┐    ┌─────────────────┐
│  products-service │    │  orders-service │
│     Port: 3001    │    │    Port: 3002   │
└─────────┬───--────┘    └─────────┬───────┘
          │                        │
          └──────────┬─────--──────┘
                     │
        ┌────────────▼────────────┐
        │    Infrastructure       │
        │  • Jaeger (16686)       │
        │  • Prometheus (9090)    │
        │  • Grafana (3000)       │
        └─────────────────────────┘
```

### Services

- **Products Service**: Manages product catalog with in-memory storage
- **Orders Service**: Creates orders and validates products via HTTP calls
- **Jaeger**: Distributed tracing collection and visualization
- **Prometheus**: Metrics collection and storage
- **Grafana**: Metrics visualization and dashboards

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Git

### Running the Application

1. **Clone and navigate to the project:**
   ```bash
   git clone <repository-url>
   cd argos
   ```

2. **Build and start all services:**
   ```bash
   docker-compose build
   docker-compose up
   ```

3. **Verify services are running:**
   ```bash
   # Check health endpoints
   curl http://localhost:3001/healthz  # Should return "OK"
   curl http://localhost:3002/healthz  # Should return "OK"
   ```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Products API | http://localhost:3001 | - |
| Orders API | http://localhost:3002 | - |
| Jaeger UI | http://localhost:16686 | - |
| Prometheus | http://localhost:9090 | - |
| Grafana | http://localhost:3000 | admin/admin |

## 📋 API Documentation

### Products Service

#### Get Product
```http
GET /products/{id}
```

**Example:**
```bash
curl http://localhost:3001/products/1
```

**Response:**
```json
{
  "id": 1,
  "name": "Quantum Laptop"
}
```

**Status Codes:**
- `200` - Product found
- `404` - Product not found

#### Health Check
```http
GET /healthz
```

#### Metrics
```http
GET /metrics
```

### Orders Service

#### Create Order
```http
POST /orders
Content-Type: application/json

{
  "productId": 1,
  "quantity": 2
}
```

**Example:**
```bash
curl -X POST http://localhost:3002/orders \
  -H "Content-Type: application/json" \
  -d '{"productId": 1, "quantity": 2}'
```

**Response:**
```json
{
  "id": 1705123456789,
  "productId": 1,
  "quantity": 2,
  "status": "confirmed",
  "createdAt": "2024-01-13T10:30:56.789Z"
}
```

**Status Codes:**
- `201` - Order created successfully
- `400` - Invalid request (missing fields, product doesn't exist)
- `500` - Internal server error

## 🔧 Development

### Local Development Setup

1. **Install dependencies for each service:**
   ```bash
   cd products-service && npm install
   cd ../orders-service && npm install
   ```

2. **Start services in development mode:**
   ```bash
   # Terminal 1 - Products Service
   cd products-service
   npm run dev

   # Terminal 2 - Orders Service
   cd orders-service
   npm run dev
   ```

3. **Run tests:**
   ```bash
   # Products Service
   cd products-service
   npm test

   # Orders Service
   cd orders-service
   npm test
   ```

### Environment Variables

#### Products Service
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `LOG_LEVEL` | `info` | Logging level |
| `JAEGER_ENDPOINT` | `http://jaeger:4318/v1/traces` | Tracing endpoint |

#### Orders Service
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3002` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `LOG_LEVEL` | `info` | Logging level |
| `JAEGER_ENDPOINT` | `http://jaeger:4318/v1/traces` | Tracing endpoint |
| `PRODUCTS_SERVICE_URL` | `http://products-service:3001` | Products service URL |

## 📊 Observability

### Distributed Tracing with Jaeger

Argos implements end-to-end distributed tracing using OpenTelemetry:

1. **Access Jaeger UI:** http://localhost:16686
2. **View traces:** Select service and click "Find Traces"
3. **Analyze spans:** Click on individual traces to see detailed timing

### Metrics with Prometheus & Grafana

**Prometheus Metrics:**
- HTTP request counts and durations
- Node.js runtime metrics (memory, CPU, GC)
- Custom business metrics (orders created)

**Grafana Setup:**
1. Access: http://localhost:3000 (admin/admin)
2. Prometheus datasource is pre-configured
3. Create dashboards for service metrics

**Example Prometheus Queries:**
```promql
# HTTP request rate
rate(http_requests_total[5m])

# Order creation rate
rate(orders_created_total[5m])

# Service availability
up{job="products-service"}
```

### Structured Logging

All services use structured JSON logging with Pino:

```json
{
  "level": 30,
  "time": 1705123456789,
  "msg": "HTTP request completed",
  "method": "GET",
  "url": "/products/1",
  "statusCode": 200,
  "duration": 45
}
```

## 🛡️ Production Readiness

### 12-Factor App Compliance

✅ **Codebase** - One codebase, multiple deployments  
✅ **Dependencies** - Explicit dependency declaration  
✅ **Config** - Configuration via environment variables  
✅ **Backing Services** - Services treated as attached resources  
✅ **Build/Release/Run** - Strict separation of stages  
✅ **Processes** - Stateless, share-nothing processes  
✅ **Port Binding** - Self-contained services export HTTP  
✅ **Concurrency** - Scale via process model  
✅ **Disposability** - Fast startup and graceful shutdown  
✅ **Dev/Prod Parity** - Keep environments similar  
✅ **Logs** - Treat logs as event streams  
✅ **Admin Processes** - One-off tasks as processes  

### Security Features

- **Non-root containers** - Services run as unprivileged users
- **Multi-stage builds** - Minimal production images
- **Health checks** - Container and application-level monitoring
- **Input validation** - Request parameter validation
- **Error handling** - Graceful error responses without data leakage

### Resilience Patterns

- **Circuit breaker behavior** - Timeout handling for HTTP calls
- **Graceful shutdown** - SIGTERM/SIGINT signal handling
- **Health checks** - Kubernetes-ready health endpoints
- **Retry logic** - Built into HTTP client configuration
- **Resource limits** - Docker container constraints

## 🧪 Testing

### Test Structure

```
src/
├── index.ts          # Main application
├── index.test.ts     # Integration tests
├── logger.ts         # Logging configuration
├── tracing.ts        # OpenTelemetry setup
└── test-setup.ts     # Test mocks and configuration
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

### Test Coverage

- **Unit tests** - Individual function testing
- **Integration tests** - Full HTTP endpoint testing
- **Mock dependencies** - External service simulation
- **Error scenarios** - Failure condition testing

## 🐳 Docker & Deployment

### Multi-stage Dockerfile

Each service uses optimized multi-stage builds:

1. **Build stage** - Full Node.js with dev dependencies
2. **Production stage** - Alpine Linux with only runtime dependencies

### Container Security

- Non-root user execution
- Minimal base images (Alpine Linux)
- No unnecessary packages
- Health check integration

### Deployment Options

**Local Development:**
```bash
docker-compose up
```

**Production Deployment:**
```bash
# Build production images
docker-compose build

# Deploy with resource limits
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

## 📁 Project Structure

```
argos/
├── products-service/
│   ├── src/
│   │   ├── index.ts           # Main application
│   │   ├── logger.ts          # Logging setup
│   │   ├── tracing.ts         # OpenTelemetry config
│   │   ├── index.test.ts      # Tests
│   │   └── test-setup.ts      # Test configuration
│   ├── Dockerfile             # Container definition
│   ├── jest.config.js         # Test configuration
│   ├── package.json           # Dependencies
│   └── tsconfig.json          # TypeScript config
├── orders-service/
│   └── [same structure as products-service]
├── grafana/
│   └── provisioning/
│       └── datasources/
│           └── prometheus.yml  # Grafana datasource
├── docker-compose.yml         # Service orchestration
├── prometheus.yml             # Metrics configuration
└── README.md                  # This file
```

## 🔍 Monitoring & Alerting

### Key Metrics to Monitor

**Service Health:**
- HTTP response times (p50, p95, p99)
- Error rates (4xx, 5xx responses)
- Service availability (uptime)

**Business Metrics:**
- Order creation rate
- Product lookup frequency
- Service dependencies health

**Infrastructure:**
- Memory usage
- CPU utilization
- Container restart frequency

### Alerting Rules

Example Prometheus alerting rules:

```yaml
groups:
  - name: argos-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
      
      - alert: ServiceDown
        expr: up{job=~".*-service"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Use conventional commit messages
- Update documentation for new features
- Ensure Docker builds pass

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

**Services not starting:**
```bash
# Check logs
docker-compose logs products-service
docker-compose logs orders-service

# Check port conflicts
lsof -i :3001
lsof -i :3002
```

**Metrics not appearing in Prometheus:**
```bash
# Verify service metrics endpoints
curl http://localhost:3001/metrics
curl http://localhost:3002/metrics

# Check Prometheus targets
# Go to http://localhost:9090/targets
```

**Traces not appearing in Jaeger:**
```bash
# Verify Jaeger is receiving traces
docker-compose logs jaeger

# Check OpenTelemetry configuration
# Ensure JAEGER_ENDPOINT is correct
```

**Orders service can't reach products service:**
```bash
# Check Docker network connectivity
docker-compose exec orders-service ping products-service

# Verify environment variables
docker-compose exec orders-service env | grep PRODUCTS_SERVICE_URL
```

### Performance Optimization

- Adjust container resource limits in docker-compose.yml
- Configure Node.js heap size for high-memory scenarios
- Implement connection pooling for external HTTP calls
- Add Redis caching layer for frequently accessed data

## 📚 Additional Resources

- [Twelve-Factor App Methodology](https://12factor.net/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Docker Multi-stage Builds](https://docs.docker.com/develop/dev-best-practices/)