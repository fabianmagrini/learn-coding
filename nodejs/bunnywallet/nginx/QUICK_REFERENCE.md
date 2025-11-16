# NGINX Quick Reference Card

## URLs After NGINX Setup

| Service | URL | Notes |
|---------|-----|-------|
| **Frontend** | https://localhost | Main application |
| **AQS API** | https://localhost/v1/accounts | REST API |
| **Metrics** | https://localhost/metrics | Prometheus (restricted) |
| **Health** | http://localhost:8081/nginx-health | NGINX health |
| **Admin** | https://localhost/v1/admin | Admin API (restricted) |
| **Prometheus** | https://localhost:9090 | Metrics dashboard |
| **Grafana** | https://localhost:3001 | Visualization |

## Common Commands

### Start/Stop

```bash
# Start all services including NGINX
docker-compose up -d

# Stop NGINX only
docker-compose stop nginx

# Restart NGINX
docker-compose restart nginx

# View NGINX logs
docker logs -f bunnywallet-nginx
```

### Configuration

```bash
# Test configuration
docker exec bunnywallet-nginx nginx -t

# Reload configuration (zero downtime)
docker exec bunnywallet-nginx nginx -s reload

# View current configuration
docker exec bunnywallet-nginx cat /etc/nginx/nginx.conf
```

### Certificates

```bash
# Regenerate certificates
cd nginx && ./generate-certs.sh

# View certificate details
openssl x509 -in nginx/certs/nginx-selfsigned.crt -noout -text

# Check certificate expiry
openssl x509 -in nginx/certs/nginx-selfsigned.crt -noout -dates
```

### Debugging

```bash
# Check NGINX status
curl http://localhost:8081/nginx-health

# View NGINX stats
curl http://localhost:8081/nginx-status

# Test backend connectivity
docker exec bunnywallet-nginx wget -qO- http://aqs-service:8080/healthz

# Follow access logs
docker exec bunnywallet-nginx tail -f /var/log/nginx/access.log

# Follow error logs
docker exec bunnywallet-nginx tail -f /var/log/nginx/error.log
```

## Rate Limits

| Endpoint Pattern | Limit | Burst | HTTP 429 Response |
|-----------------|-------|-------|-------------------|
| `/v1/*` | 100/s | 20 | Yes |
| `/v1/admin/*` | 10/s | 5 | Yes |
| `/metrics` | 30/s | 10 | Yes |

## IP Restrictions

| Endpoint | Allowed IPs |
|----------|-------------|
| `/v1/admin/*` | Docker network (172.0.0.0/8) + localhost |
| `/metrics` | Docker network (172.0.0.0/8) + localhost |
| All others | Public |

## HTTP Status Codes

| Code | Meaning | Cause |
|------|---------|-------|
| 200 | OK | Success |
| 301 | Moved Permanently | HTTP → HTTPS redirect |
| 404 | Not Found | Invalid endpoint |
| 429 | Too Many Requests | Rate limit exceeded |
| 502 | Bad Gateway | Backend down/unreachable |
| 503 | Service Unavailable | Backend unhealthy |

## Security Headers

All HTTPS responses include:

- `Strict-Transport-Security: max-age=31536000`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `X-Request-ID: <uuid>`

## Performance Features

- ✅ **Gzip compression** for text/JSON
- ✅ **HTTP/2** support
- ✅ **Keep-alive connections** (32 per upstream)
- ✅ **Static asset caching** (1 year)
- ✅ **Connection pooling**

## Troubleshooting Quick Fixes

### Browser shows security warning

```bash
# Expected with self-signed certs
# Click "Advanced" → "Proceed to localhost"

# Or trust certificate (macOS):
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  nginx/certs/nginx-selfsigned.crt
```

### 502 Bad Gateway

```bash
# Check backend is running
docker ps | grep aqs

# Check backend health
curl http://localhost:8080/healthz

# Restart backend
docker-compose restart aqs-service
```

### 429 Rate Limit

```bash
# Reduce request rate or wait
# Check current limits in nginx/conf.d/default.conf
```

### Configuration changes not applied

```bash
# Reload NGINX
docker exec bunnywallet-nginx nginx -s reload

# Or restart
docker-compose restart nginx
```

## File Locations (Inside Container)

| File | Path |
|------|------|
| Main config | `/etc/nginx/nginx.conf` |
| Server config | `/etc/nginx/conf.d/default.conf` |
| SSL cert | `/etc/nginx/certs/nginx-selfsigned.crt` |
| SSL key | `/etc/nginx/certs/nginx-selfsigned.key` |
| Access log | `/var/log/nginx/access.log` |
| Error log | `/var/log/nginx/error.log` |

## Environment Variables

None required. Configuration is file-based.

## Health Checks

NGINX runs health checks every 30 seconds:
```bash
curl -f http://localhost:8081/nginx-health || exit 1
```

Backends are checked automatically via proxy health checks.

## Load Balancing

Default algorithm: **Least Connections**

Add more AQS instances in `nginx.conf`:
```nginx
upstream aqs_backend {
    least_conn;
    server aqs-service-1:8080;
    server aqs-service-2:8080;  # Add more here
}
```

## Quick Tests

### Test HTTPS redirect

```bash
curl -I http://localhost
# Should return: HTTP/1.1 301 Moved Permanently
# Location: https://localhost/
```

### Test API through NGINX

```bash
# Get account (with self-signed cert warning bypass)
curl -k https://localhost/v1/accounts/bank-001

# Health check
curl http://localhost:8081/nginx-health
```

### Test rate limiting

```bash
# Send 200 requests quickly
for i in {1..200}; do curl -k https://localhost/v1/accounts/bank-001 & done

# Some should return 429
```

## Production Checklist

- [ ] Replace self-signed certs with Let's Encrypt
- [ ] Update server_name to actual domain
- [ ] Review and adjust rate limits
- [ ] Configure log rotation
- [ ] Set up monitoring/alerts
- [ ] Enable firewall rules
- [ ] Review IP whitelist rules
- [ ] Set up CDN for static assets
- [ ] Configure WAF (Cloudflare/AWS)
- [ ] Test failover scenarios

## Need Help?

- Full docs: `nginx/README.md`
- NGINX logs: `docker logs bunnywallet-nginx`
- Test config: `docker exec bunnywallet-nginx nginx -t`
- Project README: `../README.md`
