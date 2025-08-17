# Onya Chatbot - Deployment Guide

This document provides comprehensive guidance for deploying the Onya production-grade chatbot system to various environments.

## 🚀 Quick Start

### Prerequisites

- **Kubernetes cluster** (EKS, GKE, or AKS)
- **Container registry** access (GitHub Container Registry)
- **Database** (PostgreSQL 15+)
- **Cache** (Redis 7+)
- **CI/CD** (GitHub Actions)
- **Monitoring** (Prometheus, Grafana)
- **Secrets management** (AWS Secrets Manager, HashiCorp Vault)

### 1. Environment Setup

```bash
# Clone the repository
git clone https://github.com/your-org/onya-chatbot.git
cd onya-chatbot

# Set up environment variables
cp .env.example .env.production
# Edit .env.production with your values

# Install dependencies
npm ci
```

### 2. Deploy to Staging

```bash
# Trigger staging deployment
git push origin main

# Or manual deployment
gh workflow run cd.yml --ref main -f environment=staging
```

### 3. Deploy to Production

```bash
# Create and push a release tag
git tag v1.0.0
git push origin v1.0.0

# Or manual deployment
gh workflow run cd.yml --ref main -f environment=production -f version=v1.0.0
```

## 🏗️ Architecture Overview

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Customer App   │  │  Customer BFF   │  │ Shared Services │  │
│  │  (Frontend)     │  │   (API Layer)   │  │  (Core Logic)   │  │
│  │                 │  │                 │  │                 │  │
│  │ • React SPA     │  │ • tRPC Server   │  │ • Auth Service  │  │
│  │ • Nginx         │  │ • Rate Limiting │  │ • Chat Engine   │  │
│  │ • Static Assets │  │ • CORS Handling │  │ • LLM Gateway   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                        Data Layer                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   PostgreSQL    │  │      Redis      │  │   Monitoring    │  │
│  │                 │  │                 │  │                 │  │
│  │ • User Data     │  │ • Sessions      │  │ • Prometheus    │  │
│  │ • Chat History  │  │ • Cache         │  │ • Grafana       │  │
│  │ • Audit Logs    │  │ • Rate Limits   │  │ • AlertManager  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 CI/CD Pipeline

### Pipeline Stages

1. **Code Quality**
   - ESLint & TypeScript checks
   - Unit tests with coverage
   - Security vulnerability scanning

2. **Integration Testing**
   - Service integration tests
   - Database migration tests
   - API contract validation

3. **Build & Package**
   - Multi-platform Docker builds
   - SBOM generation
   - Image vulnerability scanning

4. **Deployment**
   - Blue-green deployments
   - Database migrations
   - Health checks & smoke tests

5. **Post-Deployment**
   - Performance monitoring
   - Alert configuration
   - Rollback capabilities

### GitHub Actions Workflows

#### CI Pipeline (`.github/workflows/ci.yml`)

```yaml
# Triggers on: push to main/develop, pull requests
# Runs: lint, test, security scan, integration tests, e2e tests
# Quality Gate: All tests must pass before merge
```

#### CD Pipeline (`.github/workflows/cd.yml`)

```yaml
# Triggers on: push to main, tag creation, manual dispatch
# Deploys to: staging (automatic), production (on tags)
# Strategy: Blue-green deployment with rollback
```

### Deployment Environments

| Environment | Trigger | URL | Purpose |
|-------------|---------|-----|---------|
| **Development** | Feature branches | `dev.onya.com` | Feature development |
| **Staging** | Main branch | `staging.onya.com` | Pre-production testing |
| **Production** | Release tags | `onya.com` | Live customer environment |

## 🐳 Container Strategy

### Docker Images

All services use multi-stage builds for optimization:

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:18-alpine AS production
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .
USER nodejs
EXPOSE 3000
CMD ["npm", "start"]
```

### Image Security

- **Non-root user** execution
- **Read-only root filesystem**
- **Minimal base images** (Alpine Linux)
- **Vulnerability scanning** with Snyk/Trivy
- **SBOM generation** for compliance

## ☸️ Kubernetes Deployment

### Cluster Requirements

```yaml
# Minimum cluster specifications
nodes: 3
cpu: 8 cores total
memory: 16GB total
storage: 100GB SSD
kubernetes: v1.28+
```

### Deployment Strategy

#### Blue-Green Deployment

1. **Deploy to Green Environment**
   ```bash
   kubectl apply -f k8s/production/ --suffix="-green"
   ```

2. **Health Check Green Environment**
   ```bash
   kubectl rollout status deployment/onya-*-green
   ```

3. **Switch Traffic**
   ```bash
   kubectl patch service onya-* -p '{"spec":{"selector":{"version":"green"}}}'
   ```

4. **Cleanup Blue Environment**
   ```bash
   kubectl delete deployment onya-*-blue
   ```

### Resource Management

#### Requests and Limits

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "500m"
```

#### Horizontal Pod Autoscaling

```yaml
minReplicas: 3
maxReplicas: 20
metrics:
- type: Resource
  resource:
    name: cpu
    target:
      type: Utilization
      averageUtilization: 70
```

#### Pod Disruption Budgets

```yaml
minAvailable: 2  # Always keep 2 pods running during updates
```

### Service Mesh (Optional)

For enhanced observability and security:

```bash
# Install Istio
istioctl install --set values.defaultRevision=default

# Enable sidecar injection
kubectl label namespace onya-chatbot istio-injection=enabled
```

## 🗄️ Database Management

### PostgreSQL Setup

#### Production Configuration

```yaml
# High availability with streaming replication
primary:
  replicas: 1
  resources:
    requests:
      memory: "2Gi"
      cpu: "1000m"
    limits:
      memory: "4Gi"
      cpu: "2000m"

replica:
  replicas: 2
  resources:
    requests:
      memory: "1Gi"
      cpu: "500m"
```

#### Backup Strategy

```bash
# Daily automated backups
kubectl create cronjob db-backup \
  --image=postgres:15 \
  --schedule="0 2 * * *" \
  -- /backup-script.sh

# Point-in-time recovery setup
pg_basebackup -h primary-db -D /backup -U replicator -W
```

### Redis Configuration

#### High Availability Setup

```yaml
# Redis Sentinel for failover
sentinel:
  enabled: true
  replicas: 3

# Redis instances
redis:
  replicas: 3
  persistence:
    enabled: true
    size: 10Gi
```

## 🔐 Security Configuration

### Secrets Management

#### AWS Secrets Manager Integration

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: onya-secrets
spec:
  secretStoreRef:
    name: aws-secretsmanager
    kind: SecretStore
  target:
    name: onya-app-secrets
  data:
  - secretKey: database-url
    remoteRef:
      key: onya/production/database
      property: url
```

#### Secret Rotation

- **Database passwords**: 90-day rotation
- **JWT secrets**: 30-day rotation
- **API keys**: 180-day rotation
- **Service tokens**: 60-day rotation

### Network Security

#### Network Policies

```yaml
# Restrict pod-to-pod communication
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: onya-network-policy
spec:
  podSelector:
    matchLabels:
      app: onya-shared-services
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: onya-customer-bff
```

#### TLS Configuration

```yaml
# Automatic TLS with cert-manager
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: onya-tls
spec:
  secretName: onya-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - onya.com
  - api.onya.com
```

## 📊 Monitoring Setup

### Prometheus Configuration

```yaml
# Scrape configuration for all services
scrape_configs:
- job_name: 'onya-services'
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
    action: keep
    regex: true
```

### Grafana Dashboards

Pre-configured dashboards available:
- **Application Overview** - Request rates, errors, latency
- **Business Metrics** - Chat sessions, escalations
- **Infrastructure** - CPU, memory, disk usage
- **Database Performance** - Connection pools, query times

### Alerting Rules

Critical alerts configured:
- **Service Down** - Immediate notification
- **High Error Rate** - > 5% for 5 minutes
- **Database Issues** - Connection failures, slow queries
- **Memory Pressure** - > 90% utilization

## 🚨 Incident Response

### Runbooks

#### Service Degradation

1. **Check service health**
   ```bash
   kubectl get pods -l app=onya-shared-services
   kubectl logs -l app=onya-shared-services --tail=100
   ```

2. **Scale up if needed**
   ```bash
   kubectl scale deployment onya-shared-services --replicas=10
   ```

3. **Check dependencies**
   ```bash
   kubectl exec -it deploy/onya-shared-services -- curl localhost:3000/health
   ```

#### Database Issues

1. **Check database connectivity**
   ```bash
   kubectl exec -it postgres-primary -- psql -c "SELECT 1"
   ```

2. **Check replication lag**
   ```bash
   kubectl exec -it postgres-replica -- psql -c "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))"
   ```

3. **Failover if needed**
   ```bash
   kubectl patch service postgres -p '{"spec":{"selector":{"role":"replica"}}}'
   ```

### Rollback Procedures

#### Automated Rollback

```bash
# Rollback deployment
kubectl rollout undo deployment/onya-shared-services

# Rollback database migration (if needed)
kubectl create job db-rollback --from=cronjob/db-rollback
```

#### Manual Rollback

```bash
# Deploy previous version
export IMAGE_TAG=previous-version
envsubst < k8s/production/shared-services.yaml | kubectl apply -f -
```

## 🔧 Environment-Specific Configuration

### Development

```yaml
replicas: 1
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
environment:
  LOG_LEVEL: debug
  LLM_PROVIDER: mock
```

### Staging

```yaml
replicas: 2
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
environment:
  LOG_LEVEL: info
  LLM_PROVIDER: openai
  TRACE_SAMPLING_RATE: "1.0"
```

### Production

```yaml
replicas: 3
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
environment:
  LOG_LEVEL: info
  LLM_PROVIDER: openai
  TRACE_SAMPLING_RATE: "0.1"
```

## 📝 Deployment Checklist

### Pre-Deployment

- [ ] Code review completed
- [ ] All tests passing
- [ ] Security scan completed
- [ ] Database migrations tested
- [ ] Staging deployment verified
- [ ] Performance tests completed

### Deployment

- [ ] Backup current database
- [ ] Deploy new version
- [ ] Run database migrations
- [ ] Verify health checks
- [ ] Run smoke tests
- [ ] Update monitoring dashboards

### Post-Deployment

- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify all features working
- [ ] Update documentation
- [ ] Notify stakeholders
- [ ] Schedule post-deployment review

## 🛠️ Troubleshooting

### Common Issues

#### Pod CrashLoopBackOff

```bash
# Check pod logs
kubectl logs pod-name --previous

# Check events
kubectl describe pod pod-name

# Common causes:
# - Missing environment variables
# - Database connection issues
# - Resource limits too low
```

#### Service Unavailable

```bash
# Check service endpoints
kubectl get endpoints service-name

# Check pod readiness
kubectl get pods -l app=service-name

# Check ingress configuration
kubectl describe ingress service-ingress
```

#### High Memory Usage

```bash
# Check resource usage
kubectl top pods

# Scale up resources
kubectl patch deployment service-name -p '{"spec":{"template":{"spec":{"containers":[{"name":"container","resources":{"limits":{"memory":"2Gi"}}}]}}}}'
```

### Log Analysis

```bash
# Follow logs in real-time
kubectl logs -f deployment/onya-shared-services

# Search for errors
kubectl logs deployment/onya-shared-services | grep ERROR

# Export logs for analysis
kubectl logs deployment/onya-shared-services --since=1h > service-logs.txt
```

## 📚 Additional Resources

### Documentation Links

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Best Practices](https://docs.docker.com/develop/best-practices/)
- [AWS EKS Guide](https://docs.aws.amazon.com/eks/)
- [Prometheus Monitoring](https://prometheus.io/docs/)

### Internal Resources

- [API Documentation](./API.md)
- [Monitoring Guide](./MONITORING.md)
- [Security Guide](./SECURITY.md)
- [Development Setup](./README.md)

---

This deployment guide provides comprehensive instructions for deploying the Onya chatbot system to production environments with enterprise-grade reliability, security, and observability.