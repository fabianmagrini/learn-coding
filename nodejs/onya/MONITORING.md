# Onya Chatbot - Monitoring & Observability Guide

This document describes the comprehensive monitoring and observability stack implemented for the Onya production-grade chatbot system.

## 📊 Overview

The monitoring stack provides complete visibility into:
- **Application Performance** - Response times, throughput, error rates
- **Business Metrics** - Chat sessions, escalations, user engagement
- **Infrastructure Health** - System resources, database, Redis
- **Security Events** - Authentication, rate limiting, suspicious activity
- **Distributed Tracing** - Request flow across services

## 🏗️ Architecture

### Core Components

1. **Prometheus** - Metrics collection and storage
2. **Grafana** - Visualization dashboards
3. **AlertManager** - Alert routing and notification
4. **Jaeger** - Distributed tracing
5. **Enhanced Logger** - Structured logging with correlation IDs

### Metrics Collection

The system collects metrics at multiple layers:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Application    │    │  Infrastructure │    │  Business       │
│  Metrics        │    │  Metrics        │    │  Metrics        │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • HTTP requests │    │ • CPU/Memory    │    │ • Chat sessions │
│ • Response time │    │ • Disk/Network  │    │ • Escalations   │
│ • Error rates   │    │ • Containers    │    │ • LLM requests  │
│ • Database      │    │ • Node metrics  │    │ • Auth events   │
│ • Redis ops     │    │ • cAdvisor      │    │ • User activity │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### 1. Start Monitoring Stack

```bash
# Start core services
docker-compose up -d

# Start monitoring stack
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

### 2. Access Dashboards

- **Grafana**: http://localhost:3003 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093
- **Jaeger**: http://localhost:16686

### 3. Verify Metrics Collection

```bash
# Check metrics endpoint
curl http://localhost:3000/metrics

# Check health endpoint
curl http://localhost:3000/health
```

## 📈 Metrics Endpoints

### Application Endpoints

| Endpoint | Description | Auth Required |
|----------|-------------|---------------|
| `/metrics` | Prometheus metrics | No |
| `/health` | Comprehensive health check | No |
| `/health/live` | Kubernetes liveness probe | No |
| `/health/ready` | Kubernetes readiness probe | No |
| `/info` | Service information | Yes (Service) |
| `/metrics/custom` | Business metrics | Yes (Service) |
| `/debug` | Debug information | Yes (Service) |

### Health Check Response

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-15T10:30:00.000Z",
    "uptime": 3600,
    "version": "1.0.0",
    "environment": "production",
    "services": {
      "database": {
        "status": "healthy",
        "responseTime": 5,
        "lastChecked": "2025-01-15T10:30:00.000Z",
        "details": { "sessions": {...} }
      },
      "redis": {
        "status": "healthy",
        "responseTime": 2,
        "lastChecked": "2025-01-15T10:30:00.000Z",
        "details": { "connected": true }
      },
      "llm": {
        "status": "healthy",
        "responseTime": 1,
        "details": { "provider": "openai" }
      },
      "system": {
        "status": "healthy",
        "details": { "memory": {...}, "cpu": {...} }
      }
    }
  }
}
```

## 📊 Available Metrics

### HTTP Metrics

```prometheus
# Request count by method, route, status
http_requests_total{method="POST", route="/api/chat/sessions", status_code="201"}

# Request duration percentiles
http_request_duration_seconds{method="POST", route="/api/chat/sessions"}

# Request and response sizes
http_request_size_bytes{method="POST", route="/api/chat/sessions"}
http_response_size_bytes{method="POST", route="/api/chat/sessions"}
```

### Business Metrics

```prometheus
# Chat metrics
chat_sessions_total{customer_tier="premium", source="web"}
chat_sessions_active{status="active"}
messages_processed_total{type="USER", source="customer"}
escalations_total{reason="billing", customer_tier="premium"}

# LLM metrics
llm_requests_total{provider="openai", model="gpt-4", status="success"}
llm_request_duration_seconds{provider="openai", model="gpt-4"}

# Authentication metrics
auth_attempts_total{method="login", status="success"}
auth_tokens_issued_total{type="access"}
rate_limit_hits_total{identifier_type="ip"}
```

### Database Metrics

```prometheus
# Connection and query metrics
db_connections_active
db_queries_total{operation="SELECT", table="chat_sessions", status="success"}
db_query_duration_seconds{operation="SELECT", table="chat_sessions"}
```

### Redis Metrics

```prometheus
# Connection and operation metrics
redis_connections_active
redis_operations_total{operation="get", status="success"}
redis_operation_duration_seconds{operation="get"}
```

### Error Metrics

```prometheus
# Error tracking
errors_total{type="validation_error", service="shared-services", severity="warning"}
```

## 🚨 Alerting Rules

### Critical Alerts

- **ServiceDown** - Service unavailable for 30s
- **DiskSpaceLow** - < 10% disk space available
- **HighMemoryUsage** - > 90% memory usage

### Warning Alerts

- **HighErrorRate** - > 10% error rate for 5 minutes
- **HighResponseTime** - 95th percentile > 2 seconds
- **DatabaseSlowQueries** - 95th percentile > 1 second
- **HighEscalationRate** - > 30% of chats escalated

### Business Alerts

- **HighChatVolume** - > 10 sessions/second
- **LLMServiceDegraded** - LLM error rate > 10%
- **HighAuthFailureRate** - > 20% auth failures

### Alert Destinations

- **Critical**: Email + Slack + Webhook (immediate)
- **Warning**: Email + Slack (30min intervals)
- **Security**: Security team + immediate notification

## 📝 Structured Logging

### Log Format

All logs use structured JSON format with correlation IDs:

```json
{
  "timestamp": "2025-01-15T10:30:00.123Z",
  "level": "info",
  "message": "Chat session created",
  "service": "shared-services",
  "environment": "production",
  "correlationId": "req-123e4567-e89b-12d3-a456-426614174000",
  "sessionId": "sess-789abc",
  "customerId": "user-456def",
  "customerTier": "premium",
  "component": "chat-engine"
}
```

### Log Levels

- **error**: System errors, failures
- **warn**: Warnings, degraded performance
- **info**: General information, business events
- **http**: HTTP request/response logging
- **debug**: Detailed debugging information
- **trace**: Very detailed tracing

### Business Event Logging

```typescript
// Chat events
logger.logChatSession('created', sessionId, { customerTier: 'premium' });

// LLM events
logger.logLLMRequest('openai', 1200, { model: 'gpt-4' });

// Auth events
logger.logAuthentication('login_success', userId);

// Security events
logger.logSecurityEvent('rate_limit_exceeded', 'medium', { ip: req.ip });
```

## 🔍 Distributed Tracing

### Jaeger Integration

Traces are automatically collected for:
- HTTP requests across services
- Database operations
- Redis operations
- LLM API calls

### Trace Context

Each request includes:
- **Correlation ID**: Unique request identifier
- **Span Information**: Service, operation, duration
- **Custom Tags**: User ID, session ID, customer tier

## 📋 Monitoring Checklist

### Daily Monitoring

- [ ] Check Grafana dashboards
- [ ] Review error rates and response times
- [ ] Monitor chat volume and escalation rates
- [ ] Verify all services are healthy

### Weekly Review

- [ ] Analyze performance trends
- [ ] Review alert effectiveness
- [ ] Check capacity planning metrics
- [ ] Update alert thresholds if needed

### Monthly Analysis

- [ ] Review business metrics trends
- [ ] Analyze customer satisfaction correlation
- [ ] Plan infrastructure scaling
- [ ] Update monitoring strategy

## 🔧 Configuration

### Environment Variables

```bash
# Logging
LOG_LEVEL=info
NODE_ENV=production

# Metrics
METRICS_ENABLED=true
PROMETHEUS_PORT=9090

# Tracing
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
TRACE_SAMPLING_RATE=0.1
```

### Prometheus Configuration

Key scrape targets:
- `shared-services:3000/metrics` (15s interval)
- `customer-bff:3001/metrics` (15s interval)
- `node-exporter:9100` (15s interval)
- `cadvisor:8080` (15s interval)

### Grafana Dashboards

Pre-configured dashboards include:
- **Application Overview** - Request rates, errors, latency
- **Business Metrics** - Chat sessions, escalations, user activity
- **Infrastructure** - System resources, containers
- **Database** - Connection pools, query performance
- **Security** - Authentication, rate limiting

## 🛠️ Troubleshooting

### Common Issues

**High Memory Usage**
```bash
# Check memory metrics
curl http://localhost:3000/debug

# Review container stats
docker stats
```

**Database Slow Queries**
```bash
# Check query metrics
curl http://localhost:3000/metrics/custom

# Review database logs
docker logs onya-postgres
```

**Missing Metrics**
```bash
# Verify service health
curl http://localhost:3000/health

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets
```

### Log Analysis

```bash
# Follow application logs
docker logs -f onya-shared-services

# Search for correlation ID
docker logs onya-shared-services | grep "req-123e4567"

# Filter by component
docker logs onya-shared-services | grep '"component":"chat-engine"'
```

## 🔐 Security Monitoring

### Security Events Tracked

- Failed authentication attempts
- Rate limiting activations
- Suspicious API usage patterns
- Token validation failures
- Permission denied events

### Security Alerts

- **HighAuthFailureRate** - Potential brute force attack
- **RateLimitingActive** - DoS attempt or abuse
- **UnauthorizedAccess** - Security breach attempt

## 📚 Resources

### External Documentation

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [AlertManager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)

### Internal Links

- [Development Setup](./README.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Security Guide](./SECURITY.md)
- [API Documentation](./API.md)

---

## 🎯 Next Steps

1. **Set up external monitoring** - Datadog, New Relic, or similar
2. **Implement log aggregation** - ELK stack or similar
3. **Add synthetic monitoring** - Uptime checks and user journey tests
4. **Create runbooks** - Incident response procedures
5. **Set up SLA monitoring** - Track and alert on SLA violations

The monitoring stack provides comprehensive visibility into the Onya chatbot system's health, performance, and business metrics, enabling proactive issue detection and data-driven optimization.