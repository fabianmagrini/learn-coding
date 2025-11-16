# NGINX API Gateway for BunnyWallet

## Overview

This NGINX configuration provides a production-grade API gateway for the BunnyWallet application, offering:

- **TLS/HTTPS termination** with self-signed certificates (dev) or Let's Encrypt (prod)
- **Reverse proxy** for AQS backend and React frontend
- **Rate limiting** to prevent API abuse
- **Load balancing** with health checks
- **Security headers** (HSTS, X-Frame-Options, etc.)
- **Request ID tracking** for distributed tracing
- **Static asset caching** for performance

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTPS (443)
       ▼
┌─────────────┐
│    NGINX    │ ← API Gateway
│  (Gateway)  │
└──────┬──────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       │              │              │              │
       ▼              ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Frontend │   │   AQS    │   │Prometheus│   │ Grafana  │
│  (3000)  │   │  (8080)  │   │  (9090)  │   │  (3001)  │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
```

## Directory Structure

```
nginx/
├── nginx.conf                 # Main NGINX configuration
├── conf.d/
│   └── default.conf          # Server blocks and routing
├── certs/
│   ├── nginx-selfsigned.crt  # Self-signed certificate
│   ├── nginx-selfsigned.key  # Private key
│   └── nginx-selfsigned.csr  # Certificate signing request
├── Dockerfile                # Docker image for NGINX
├── generate-certs.sh         # Certificate generation script
└── README.md                 # This file
```

## Quick Start

### 1. Generate SSL Certificates

For development, generate self-signed certificates:

```bash
cd nginx
./generate-certs.sh
```

This creates:
- `certs/nginx-selfsigned.crt` - SSL certificate
- `certs/nginx-selfsigned.key` - Private key

**⚠️ WARNING:** Self-signed certificates will show browser warnings. This is normal for development.

### 2. Build and Run with Docker Compose

```bash
# From project root
docker-compose up -d nginx
```

### 3. Access the Application

- **Frontend (HTTPS):** https://localhost
- **AQS API (HTTPS):** https://localhost/v1/accounts
- **Health Check:** http://localhost:8081/nginx-health
- **Prometheus:** https://localhost:9090
- **Grafana:** https://localhost:3001

## Configuration Details

### Main Configuration (`nginx.conf`)

Key settings:

- **Worker processes:** Auto-detected based on CPU cores
- **Connections per worker:** 1024
- **Gzip compression:** Enabled for text/JSON/JS
- **Rate limiting zones:** Configured for API, admin, and metrics
- **JSON access logs:** Structured logging for analysis

### Server Configuration (`conf.d/default.conf`)

#### HTTP → HTTPS Redirect

All HTTP (port 80) traffic is redirected to HTTPS (port 443):

```nginx
server {
    listen 80;
    return 301 https://$server_name$request_uri;
}
```

#### HTTPS Server Block

Main application server on port 443:

**TLS Configuration:**
- Protocols: TLSv1.2, TLSv1.3
- Ciphers: Modern, secure cipher suites
- Session cache: 10MB, 10-minute timeout

**Security Headers:**
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

#### Routing Rules

##### Frontend (React App)

```nginx
location / {
    proxy_pass http://frontend:3000;
    # WebSocket support for hot reload
}
```

##### AQS API

```nginx
location /v1/ {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://aqs-service:8080;
    # Rate limit: 100 req/s, burst 20
}
```

##### Prometheus Metrics

```nginx
location /metrics {
    limit_req zone=metrics_limit burst=10 nodelay;
    proxy_pass http://aqs-service:8080/metrics;
    # IP restricted to Docker network
}
```

##### Admin Endpoints

```nginx
location /v1/admin/ {
    limit_req zone=admin_limit burst=5 nodelay;
    # IP whitelist: Docker network + localhost only
}
```

## Rate Limiting

NGINX implements rate limiting to prevent abuse:

| Endpoint | Rate Limit | Burst | Description |
|----------|------------|-------|-------------|
| `/v1/*` | 100 req/s | 20 | General API endpoints |
| `/v1/admin/*` | 10 req/s | 5 | Admin operations |
| `/metrics` | 30 req/s | 10 | Prometheus scraping |

**When rate limit exceeded:**
- HTTP Status: 429 (Too Many Requests)
- Client should implement exponential backoff

## Load Balancing

NGINX uses `least_conn` algorithm for load balancing:

```nginx
upstream aqs_backend {
    least_conn;
    server aqs-service:8080 max_fails=3 fail_timeout=30s;
    # Add more instances here:
    # server aqs-service-2:8080 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

**Health Checks:**
- Max failures: 3
- Fail timeout: 30 seconds
- After 3 failures, server is marked down for 30s

## Health Monitoring

### NGINX Health Check

```bash
curl http://localhost:8081/nginx-health
# Response: healthy
```

### NGINX Status (Stats)

```bash
curl http://localhost:8081/nginx-status
# Active connections, requests, etc.
```

**Note:** Status endpoint is IP-restricted (Docker network + localhost only)

### Backend Health Checks

NGINX automatically marks backends as down if they fail health checks:

```nginx
proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
proxy_next_upstream_tries 2;
```

## Security Features

### TLS/SSL Configuration

**Development (Self-Signed):**
- Certificate valid for 365 days
- Subject: CN=localhost
- SANs: localhost, bunnywallet.local, 127.0.0.1

**Production (Let's Encrypt):**
See "Production Deployment" section below.

### IP Whitelisting

Admin and metrics endpoints are restricted:

```nginx
# Allow Docker network
allow 172.0.0.0/8;
# Allow localhost
allow 127.0.0.1;
# Deny all others
deny all;
```

### CORS Handling

CORS is handled at the application level (AQS service), not NGINX.

### Request ID Tracking

Every request gets a unique ID for tracing:

```nginx
add_header X-Request-ID $request_id always;
proxy_set_header X-Request-ID $request_id;
```

## Performance Tuning

### Connection Pooling

```nginx
upstream aqs_backend {
    keepalive 32;  # Keep 32 connections open
}

proxy_http_version 1.1;
proxy_set_header Connection "";
```

### Static Asset Caching

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Gzip Compression

Enabled for:
- Text (HTML, CSS, JS)
- JSON
- XML
- Fonts
- SVG

Compression level: 6 (balanced)

## Logging

### Access Logs

**Standard Format:**
```
/var/log/nginx/access.log
```

**JSON Format:**
```json
{
  "time_local": "16/Nov/2025:10:30:45 +0000",
  "remote_addr": "172.18.0.1",
  "request": "GET /v1/accounts HTTP/1.1",
  "status": "200",
  "upstream_response_time": "0.123"
}
```

### Error Logs

```
/var/log/nginx/error.log
```

Level: `warn` (can be changed to `info`, `debug` for troubleshooting)

### View Logs

```bash
# Access logs
docker logs bunnywallet-nginx

# Follow logs
docker logs -f bunnywallet-nginx

# Inside container
docker exec bunnywallet-nginx tail -f /var/log/nginx/access.log
```

## Troubleshooting

### Certificate Warnings

**Problem:** Browser shows "Your connection is not private"

**Solution:**
1. This is expected with self-signed certificates
2. Click "Advanced" → "Proceed to localhost (unsafe)" in development
3. For production, use Let's Encrypt

**Trust Certificate (macOS):**
```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  nginx/certs/nginx-selfsigned.crt
```

**Trust Certificate (Linux):**
```bash
sudo cp nginx/certs/nginx-selfsigned.crt /usr/local/share/ca-certificates/bunnywallet.crt
sudo update-ca-certificates
```

### 502 Bad Gateway

**Problem:** NGINX returns 502 when accessing application

**Causes:**
1. Backend service (AQS, frontend) is not running
2. Backend service is not healthy
3. Network connectivity issue

**Debug:**
```bash
# Check backend health
curl http://localhost:8080/healthz

# Check NGINX can reach backend
docker exec bunnywallet-nginx wget -qO- http://aqs-service:8080/healthz

# Check logs
docker logs bunnywallet-nginx
docker logs bunnywallet-aqs
```

### 429 Too Many Requests

**Problem:** Rate limit exceeded

**Solution:**
1. Implement exponential backoff in client
2. Reduce request rate
3. Adjust rate limits in `nginx.conf` if needed

### NGINX Won't Start

**Problem:** NGINX container fails to start

**Debug:**
```bash
# Test configuration
docker exec bunnywallet-nginx nginx -t

# Check syntax
docker run --rm -v $(pwd)/nginx:/etc/nginx nginx:1.25-alpine nginx -t
```

**Common issues:**
- Missing SSL certificates
- Syntax error in config
- Port already in use

## Production Deployment

### Let's Encrypt (Certbot)

For production, use Let's Encrypt for free SSL certificates:

1. **Install Certbot:**
```bash
apt-get install certbot python3-certbot-nginx
```

2. **Obtain Certificate:**
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

3. **Auto-renewal:**
```bash
certbot renew --dry-run
```

Add to cron for automatic renewal:
```bash
0 3 * * * certbot renew --quiet
```

### Update Configuration

Replace in `default.conf`:

```nginx
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

### Environment-Specific Settings

**Production hardening:**

1. **Disable IP whitelisting for public APIs**
2. **Enable stricter rate limits**
3. **Add DDoS protection** (Cloudflare, AWS WAF)
4. **Set proper CORS origins**
5. **Enable access logs for monitoring**
6. **Configure log rotation**

## Monitoring & Metrics

### NGINX Metrics

Access NGINX status:
```bash
curl http://localhost:8081/nginx-status
```

Output:
```
Active connections: 15
server accepts handled requests
 1234 1234 5678
Reading: 0 Writing: 5 Waiting: 10
```

### Prometheus Integration

NGINX metrics can be exported to Prometheus using:
- **nginx-prometheus-exporter**
- **VTS module** (nginx-module-vts)

Example docker-compose addition:
```yaml
nginx-exporter:
  image: nginx/nginx-prometheus-exporter:latest
  ports:
    - "9113:9113"
  command:
    - '-nginx.scrape-uri=http://nginx:8081/nginx-status'
```

## Advanced Configuration

### Multiple AQS Instances

For high availability, run multiple AQS instances:

```nginx
upstream aqs_backend {
    least_conn;
    server aqs-service-1:8080 weight=2 max_fails=3 fail_timeout=30s;
    server aqs-service-2:8080 weight=2 max_fails=3 fail_timeout=30s;
    server aqs-service-3:8080 weight=1 max_fails=3 fail_timeout=30s;  # Backup
    keepalive 32;
}
```

### Request Buffering

Control buffering for large uploads:

```nginx
client_body_buffer_size 128k;
client_max_body_size 20M;
proxy_buffering on;
proxy_buffer_size 4k;
proxy_buffers 8 4k;
```

### Caching (Optional)

Enable proxy caching for GET requests:

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;

location /v1/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_use_stale error timeout updating;
    add_header X-Cache-Status $upstream_cache_status;
}
```

## Best Practices

1. **Always use HTTPS in production**
2. **Regularly update NGINX version**
3. **Monitor rate limit violations**
4. **Set up log rotation** to prevent disk full
5. **Use environment-specific configurations**
6. **Test configuration before deploying** (`nginx -t`)
7. **Monitor backend health** and response times
8. **Enable HTTP/2** for better performance
9. **Use CDN** for static assets in production
10. **Implement proper error pages**

## Additional Documentation

### BunnyWallet NGINX Guides

- **[REQUEST_FLOW.md](REQUEST_FLOW.md)** - Visual request flow diagrams
  - HTTP to HTTPS redirect flow
  - Frontend request flow
  - API request flow with rate limiting
  - Admin request flow with IP restrictions
  - Load balancing behavior
  - Cache hit vs cache miss flows
  - Circuit breaker integration
  - Error handling flows
  - Performance optimization features

- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Comprehensive testing guide
  - Quick test suite
  - Manual testing procedures
  - Automated testing scripts
  - Load testing with Apache Bench and wrk
  - Security testing
  - Performance benchmarks
  - Integration testing
  - E2E workflow tests

- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick reference card
  - Common commands
  - URL mappings
  - Rate limits
  - Troubleshooting quick fixes

### Project Documentation

- **[../NGINX_IMPLEMENTATION.md](../NGINX_IMPLEMENTATION.md)** - Implementation summary
- **[../README.md](../README.md)** - Main project documentation

## Resources

### NGINX Official

- [NGINX Documentation](https://nginx.org/en/docs/)
- [NGINX Security Best Practices](https://www.nginx.com/blog/mitigating-ddos-attacks-with-nginx-and-nginx-plus/)
- [NGINX Rate Limiting](https://www.nginx.com/blog/rate-limiting-nginx/)
- [NGINX Load Balancing](https://docs.nginx.com/nginx/admin-guide/load-balancer/)

### Security & TLS

- [Let's Encrypt](https://letsencrypt.org/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [SSL Labs Server Test](https://www.ssllabs.com/ssltest/)
- [testssl.sh](https://testssl.sh/)

### Testing & Monitoring

- [Apache Bench (ab)](https://httpd.apache.org/docs/2.4/programs/ab.html)
- [wrk - HTTP benchmarking tool](https://github.com/wg/wrk)
- [Prometheus NGINX Exporter](https://github.com/nginxinc/nginx-prometheus-exporter)

## Support

For issues or questions:
- Check NGINX error logs: `docker logs bunnywallet-nginx`
- Test configuration: `docker exec bunnywallet-nginx nginx -t`
- Reload configuration: `docker exec bunnywallet-nginx nginx -s reload`
- Run test suite: `./nginx/test-nginx.sh`
- Check main README.md for project-wide documentation

### Documentation Index

1. **Start here**: [README.md](README.md) - This file
2. **Quick reference**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Commands and URLs
3. **Request flows**: [REQUEST_FLOW.md](REQUEST_FLOW.md) - Visual diagrams
4. **Testing**: [TESTING_GUIDE.md](TESTING_GUIDE.md) - Comprehensive test guide
5. **Implementation**: [../NGINX_IMPLEMENTATION.md](../NGINX_IMPLEMENTATION.md) - Project summary
