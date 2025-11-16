# NGINX Request Flow Documentation

## Overview

This document provides detailed visual flows for all request types through the NGINX API Gateway in BunnyWallet.

## Table of Contents

- [HTTP to HTTPS Redirect Flow](#http-to-https-redirect-flow)
- [Frontend Request Flow](#frontend-request-flow)
- [API Request Flow (with Rate Limiting)](#api-request-flow-with-rate-limiting)
- [Admin Request Flow (with IP Restriction)](#admin-request-flow-with-ip-restriction)
- [Load Balancing Flow](#load-balancing-flow)
- [Cache Hit vs Cache Miss](#cache-hit-vs-cache-miss)
- [Circuit Breaker Integration](#circuit-breaker-integration)
- [Error Handling Flows](#error-handling-flows)

---

## HTTP to HTTPS Redirect Flow

All HTTP traffic is automatically redirected to HTTPS for security.

```
┌─────────┐
│ Browser │
└────┬────┘
     │
     │ 1. HTTP GET http://localhost/
     ▼
┌──────────────┐
│ NGINX:80     │
│ HTTP Server  │
└────┬─────────┘
     │
     │ 2. Match: listen 80
     │ 3. Execute: return 301 https://$server_name$request_uri
     ▼
┌─────────┐
│ Browser │◄─── HTTP/1.1 301 Moved Permanently
└────┬────┘     Location: https://localhost/
     │
     │ 4. Follow redirect
     │ HTTPS GET https://localhost/
     ▼
┌──────────────┐
│ NGINX:443    │
│ HTTPS Server │
└────┬─────────┘
     │
     │ 5. TLS handshake
     │ 6. Process request
     ▼
[Continue to appropriate backend]
```

**Key Points:**
- All HTTP requests → 301 redirect to HTTPS
- Preserves path and query string
- HSTS header ensures future requests use HTTPS
- No exceptions (all traffic must use HTTPS)

---

## Frontend Request Flow

Requests for the React frontend application.

```
┌─────────┐
│ Browser │
└────┬────┘
     │
     │ GET https://localhost/
     ▼
┌─────────────────────────┐
│ NGINX:443               │
│ TLS Termination         │
└────┬────────────────────┘
     │
     │ 1. TLS Handshake (TLS 1.2/1.3)
     │ 2. Decrypt HTTPS
     ▼
┌─────────────────────────┐
│ NGINX Server Block      │
│ Location: /             │
└────┬────────────────────┘
     │
     │ 3. Match location /
     │ 4. Add security headers:
     │    - X-Request-ID
     │    - HSTS
     │    - X-Frame-Options
     │    - X-Content-Type-Options
     │    - X-XSS-Protection
     ▼
┌─────────────────────────┐
│ Upstream:               │
│ frontend_backend        │
└────┬────────────────────┘
     │
     │ 5. proxy_pass http://frontend:3000
     │ 6. Connection: "" (enable keep-alive)
     │ 7. HTTP/1.1
     ▼
┌─────────────────────────┐
│ Frontend Container      │
│ React Dev Server:3000   │
└────┬────────────────────┘
     │
     │ 8. Serve React app
     │ 9. Return HTML/JS/CSS
     ▼
┌─────────────────────────┐
│ NGINX                   │
│ Response Processing     │
└────┬────────────────────┘
     │
     │ 10. Apply gzip compression (if applicable)
     │ 11. Add Cache-Control (static assets)
     │ 12. Encrypt with TLS
     ▼
┌─────────┐
│ Browser │◄─── HTTPS Response with React app
└─────────┘
```

**Configuration:**
```nginx
location / {
    proxy_pass http://frontend_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Request-ID $request_id;
}
```

---

## API Request Flow (with Rate Limiting)

Flow for AQS API requests with rate limiting enforcement.

```
┌─────────┐
│ Client  │
└────┬────┘
     │
     │ GET https://localhost/v1/accounts/BNK-001
     │ Authorization: Bearer <token>
     ▼
┌─────────────────────────────────┐
│ NGINX:443 - TLS Termination     │
└────┬────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ Location: /v1/                  │
│ Rate Limit Check                │
└────┬────────────────────────────┘
     │
     │ 1. Check zone: api_limit
     │    Rate: 100 req/s
     │    Burst: 20
     │    Key: $binary_remote_addr
     ▼
     ┌───────────────────┐
     │ Under limit?      │
     └────┬──────────┬───┘
          │ NO       │ YES
          │          │
          ▼          ▼
    ┌─────────┐  ┌──────────────────┐
    │ Return  │  │ Proceed          │
    │ 429     │  │                  │
    └─────────┘  └────┬─────────────┘
                      │
                      │ 2. Add headers:
                      │    - X-Request-ID: <uuid>
                      │    - X-Real-IP
                      │    - X-Forwarded-For
                      │    - X-Forwarded-Proto: https
                      ▼
                 ┌──────────────────┐
                 │ Upstream:        │
                 │ aqs_backend      │
                 └────┬─────────────┘
                      │
                      │ 3. Select backend (least_conn)
                      │ 4. Health check (max_fails: 3)
                      │ 5. proxy_pass http://aqs-service:8080
                      ▼
                 ┌──────────────────┐
                 │ AQS Service      │
                 │ Port 8080        │
                 └────┬─────────────┘
                      │
                      │ 6. Process request
                      │ 7. Fetch from cache/backends
                      │ 8. Return JSON response
                      ▼
                 ┌──────────────────┐
                 │ NGINX Response   │
                 │ Processing       │
                 └────┬─────────────┘
                      │
                      │ 9. Gzip compress (if > 1KB)
                      │ 10. Add security headers
                      │ 11. Encrypt with TLS
                      ▼
                 ┌─────────┐
                 │ Client  │◄─── 200 OK + JSON
                 └─────────┘
```

**Rate Limit Configuration:**
```nginx
# Define rate limit zone (in nginx.conf)
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;

# Apply rate limit (in default.conf)
location /v1/ {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://aqs_backend;
}
```

**Rate Limit Behavior:**
- First 100 requests/second: Pass immediately
- Next 20 requests (burst): Pass immediately, but count toward limit
- Beyond 120 in 1 second: Return 429 Too Many Requests

---

## Admin Request Flow (with IP Restriction)

Admin endpoints have both IP whitelisting and stricter rate limits.

```
┌─────────┐
│ Client  │
│ IP: X   │
└────┬────┘
     │
     │ POST https://localhost/v1/admin/backends/bank/simulate
     │ Authorization: Bearer <admin-token>
     ▼
┌─────────────────────────────────┐
│ NGINX:443 - TLS Termination     │
└────┬────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ Location: /v1/admin/            │
│ IP Whitelist Check              │
└────┬────────────────────────────┘
     │
     │ 1. Check client IP
     ▼
     ┌───────────────────────────────┐
     │ IP in whitelist?              │
     │ - 172.0.0.0/8 (Docker)        │
     │ - 127.0.0.1 (localhost)       │
     └────┬──────────────────┬───────┘
          │ NO               │ YES
          │                  │
          ▼                  ▼
    ┌─────────┐      ┌──────────────────┐
    │ Return  │      │ Rate Limit Check │
    │ 403     │      │                  │
    └─────────┘      └────┬─────────────┘
                          │
                          │ 2. Check zone: admin_limit
                          │    Rate: 10 req/s
                          │    Burst: 5
                          ▼
                     ┌───────────────┐
                     │ Under limit?  │
                     └────┬──────┬───┘
                          │ NO   │ YES
                          │      │
                          ▼      ▼
                    ┌─────────┐  ┌──────────────┐
                    │ Return  │  │ Proxy to AQS │
                    │ 429     │  │              │
                    └─────────┘  └────┬─────────┘
                                      │
                                      │ 3. Forward to AQS
                                      │ 4. Process admin action
                                      ▼
                                 ┌─────────┐
                                 │ Return  │
                                 │ 200 OK  │
                                 └─────────┘
```

**Security Layers:**
1. **TLS/HTTPS** - Encrypted transport
2. **IP Whitelist** - Network-level access control
3. **JWT Authentication** - Application-level auth (handled by AQS)
4. **Rate Limiting** - Stricter limits (10/s vs 100/s)
5. **Scope Validation** - Requires `admin:simulate` scope

---

## Load Balancing Flow

How NGINX distributes traffic across multiple AQS instances (when configured).

```
┌─────────┐ ┌─────────┐ ┌─────────┐
│Client 1 │ │Client 2 │ │Client 3 │
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
     │ Req 1     │ Req 2     │ Req 3
     └───────────┼───────────┘
                 ▼
        ┌─────────────────┐
        │ NGINX           │
        │ Upstream:       │
        │ aqs_backend     │
        │ Algorithm:      │
        │ least_conn      │
        └────┬────────────┘
             │
             │ 1. Count active connections per backend
             │    Backend 1: 5 active
             │    Backend 2: 3 active  ← Choose this (least)
             │    Backend 3: 7 active
             ▼
    ┌────────┴────────┬────────────┐
    │                 │            │
    ▼                 ▼            ▼
┌─────────┐      ┌─────────┐  ┌─────────┐
│ AQS-1   │      │ AQS-2   │  │ AQS-3   │
│ :8080   │      │ :8080   │  │ :8080   │
│ Busy    │      │ Selected│  │ Busy    │
└─────────┘      └────┬────┘  └─────────┘
                      │
                      │ 2. Process request
                      │ 3. Return response
                      ▼
                 ┌─────────────────┐
                 │ NGINX           │
                 │ Response        │
                 └────┬────────────┘
                      │
                      ▼
                 ┌─────────┐
                 │ Client  │
                 └─────────┘
```

**Health Check Behavior:**
```
Time: 0s
Backend 1: Healthy (0 fails)
Backend 2: Healthy (0 fails)
Backend 3: Healthy (0 fails)

Time: 10s - Backend 2 fails
Backend 1: Healthy (0 fails)  ← Traffic goes here
Backend 2: Failed (1/3 fails) ← Still accepting requests
Backend 3: Healthy (0 fails)  ← And here

Time: 12s - Backend 2 fails again
Backend 1: Healthy (0 fails)  ← Traffic goes here
Backend 2: Failed (2/3 fails) ← Still accepting requests
Backend 3: Healthy (0 fails)  ← And here

Time: 15s - Backend 2 fails third time
Backend 1: Healthy (0 fails)  ← All traffic
Backend 2: DOWN (3/3 fails)   ✗ Marked down for 30s
Backend 3: Healthy (0 fails)  ← All traffic

Time: 45s - Timeout expires
Backend 1: Healthy (0 fails)
Backend 2: Healthy (0 fails)  ← Retries allowed, fail count reset
Backend 3: Healthy (0 fails)
```

**Configuration:**
```nginx
upstream aqs_backend {
    least_conn;  # Algorithm
    server aqs-service-1:8080 max_fails=3 fail_timeout=30s;
    server aqs-service-2:8080 max_fails=3 fail_timeout=30s;
    server aqs-service-3:8080 max_fails=3 fail_timeout=30s;
    keepalive 32;  # Connection pool
}
```

---

## Cache Hit vs Cache Miss

Integration with AQS service caching layer.

### Cache Hit Flow

```
┌─────────┐
│ Client  │
└────┬────┘
     │ GET /v1/accounts/BNK-001
     ▼
┌──────────┐
│ NGINX    │
└────┬─────┘
     │ 1. No NGINX-level cache (pass-through)
     │ 2. Proxy to AQS
     ▼
┌──────────────────────┐
│ AQS Service          │
└────┬─────────────────┘
     │
     │ 3. Check Redis cache
     ▼
┌──────────────────────┐
│ Redis                │
│ Key: account:BNK-001 │
│ Status: EXISTS       │
│ TTL: 250s            │
└────┬─────────────────┘
     │
     │ 4. Return cached value
     ▼
┌──────────────────────┐
│ AQS Response         │
│ {                    │
│   "accountId": "...", │
│   "cached": true,    │
│   "stale": false     │
│ }                    │
└────┬─────────────────┘
     │
     │ 5. Proxy back through NGINX
     ▼
┌─────────┐
│ Client  │◄─── 200 OK (latency: ~5ms)
└─────────┘
```

### Cache Miss Flow

```
┌─────────┐
│ Client  │
└────┬────┘
     │ GET /v1/accounts/BNK-001
     │ Cache-Control: no-cache
     ▼
┌──────────┐
│ NGINX    │
└────┬─────┘
     │ 1. Forward Cache-Control header
     │ 2. Proxy to AQS
     ▼
┌──────────────────────┐
│ AQS Service          │
└────┬─────────────────┘
     │
     │ 3. Check Redis cache
     ▼
┌──────────────────────┐
│ Redis                │
│ Key: account:BNK-001 │
│ Status: NOT FOUND    │
│ (or no-cache forced) │
└────┬─────────────────┘
     │
     │ 4. Call backend adapter
     ▼
┌──────────────────────┐
│ Bank Service         │
│ (via Circuit Breaker)│
└────┬─────────────────┘
     │
     │ 5. Return fresh data
     ▼
┌──────────────────────┐
│ AQS Service          │
│ - Map to canonical   │
│ - Store in Redis     │
│ - Set TTL: 300s      │
└────┬─────────────────┘
     │
     │ 6. Return response
     ▼
┌──────────┐
│ NGINX    │
└────┬─────┘
     │ 7. Proxy response
     ▼
┌─────────┐
│ Client  │◄─── 200 OK (latency: ~150ms)
└─────────┘    {
               "accountId": "BNK-001",
               "cached": false,
               "stale": false
               }
```

---

## Circuit Breaker Integration

How NGINX interacts with AQS circuit breakers.

```
┌─────────┐
│ Client  │
└────┬────┘
     │ GET /v1/accounts/LOAN-001
     ▼
┌──────────────────┐
│ NGINX            │
│ - Rate limit: OK │
│ - Proxy to AQS   │
└────┬─────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ AQS Service                     │
│ Circuit Breaker State Check     │
└────┬────────────────────────────┘
     │
     │ Check: Loan Adapter Circuit Breaker
     ▼
     ┌─────────────────────┐
     │ State: CLOSED?      │
     │ (All good)          │
     └────┬────────────┬───┘
          │ NO         │ YES
          │            │
          ▼            ▼
   ┌──────────┐   ┌────────────────────┐
   │ State:   │   │ Call loan-service  │
   │ OPEN?    │   │ via adapter        │
   └────┬─────┘   └────┬───────────────┘
        │              │
        │              │ Success
        ▼              ▼
   ┌─────────────┐  ┌─────────┐
   │ Return stale│  │ Return  │
   │ from cache  │  │ 200 OK  │
   │ OR          │  └─────────┘
   │ Return 503  │
   └─────────────┘

Circuit Breaker State Machine:
┌────────┐
│ CLOSED │ (Normal operation)
└───┬────┘
    │
    │ 3 failures
    ▼
┌────────┐
│  OPEN  │ (Rejecting requests, serving stale)
└───┬────┘
    │
    │ After 30s
    ▼
┌────────────┐
│ HALF-OPEN  │ (Testing if backend recovered)
└─────┬──────┘
      │
      ├─ Success → CLOSED
      └─ Failure → OPEN
```

**Circuit Breaker Config (in AQS):**
```typescript
{
  halfOpenAfter: 30000,      // Try recovery after 30s
  threshold: 0.5,            // Open if 50% fail
  minimumRps: 5,             // Need 5 requests before opening
  samplingDuration: 30000    // Sample over 30s window
}
```

---

## Error Handling Flows

### 502 Bad Gateway

```
┌─────────┐
│ Client  │
└────┬────┘
     │ GET /v1/accounts/BNK-001
     ▼
┌──────────┐
│ NGINX    │
└────┬─────┘
     │ 1. Try proxy_pass http://aqs-service:8080
     ▼
     ┌────────────────────┐
     │ Connection failed? │
     │ - Timeout          │
     │ - Connection refused
     └────┬───────────────┘
          │
          │ 2. Check proxy_next_upstream
          │    Settings: error timeout invalid_header
          │               http_500 http_502 http_503
          ▼
     ┌────────────────────┐
     │ More backends?     │
     └────┬───────────┬───┘
          │ NO        │ YES
          │           │
          ▼           ▼
     ┌────────┐  ┌────────────────┐
     │ Return │  │ Try next       │
     │ 502    │  │ backend        │
     └────┬───┘  └────┬───────────┘
          │           │
          │           └─ (Repeat)
          ▼
     ┌─────────┐
     │ Client  │◄─── 502 Bad Gateway
     └─────────┘     nginx/1.25 (proxy error)
```

### 503 Service Unavailable

```
┌─────────┐
│ Client  │
└────┬────┘
     │ GET /v1/accounts/BNK-001
     ▼
┌──────────┐
│ NGINX    │
└────┬─────┘
     │ 1. Proxy to AQS
     ▼
┌──────────────────────┐
│ AQS Service          │
│ All backends down    │
│ No stale cache       │
└────┬─────────────────┘
     │
     │ 2. Return 503
     ▼
┌──────────┐
│ NGINX    │
│ Receives │
│ HTTP 503 │
└────┬─────┘
     │
     │ 3. Forward 503 to client
     ▼
┌─────────┐
│ Client  │◄─── 503 Service Unavailable
└─────────┘     {
                "error": "Service temporarily unavailable",
                "code": "SERVICE_UNAVAILABLE"
                }
```

### 429 Rate Limit Exceeded

```
┌─────────┐
│ Client  │
└────┬────┘
     │ 121st request in 1 second
     ▼
┌──────────────────────┐
│ NGINX Rate Limiter   │
│ Zone: api_limit      │
│ Current: 121/100     │
│ Burst: 20/20 used    │
└────┬─────────────────┘
     │
     │ Over limit!
     ▼
┌──────────┐
│ Return   │
│ 429      │
└────┬─────┘
     │
     ▼
┌─────────┐
│ Client  │◄─── 429 Too Many Requests
└─────────┘
```

**Client Retry Strategy:**
```javascript
async function fetchWithRetry(url, options = {}) {
  const maxRetries = 3;
  let delay = 1000; // Start with 1 second

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        // Rate limited - exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Double the delay
        continue;
      }

      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}
```

---

## Request Timeline Example

Complete timeline for a single API request.

```
Time (ms)  | Component        | Action
-----------|------------------|----------------------------------------
0          | Client           | Send HTTPS request
2          | NGINX            | Receive request on port 443
3          | NGINX            | TLS decrypt (TLS 1.3 session resume)
4          | NGINX            | Rate limit check (zone lookup)
5          | NGINX            | Upstream selection (least_conn)
6          | NGINX            | Proxy to AQS (connection pool reuse)
8          | AQS              | Receive request
9          | AQS              | JWT validation
10         | AQS              | Check Redis cache
12         | Redis            | Cache hit! Return value
14         | AQS              | Map response
15         | AQS              | Add telemetry headers
16         | AQS              | Send response
18         | NGINX            | Receive from upstream
19         | NGINX            | Apply gzip compression
21         | NGINX            | Add security headers
22         | NGINX            | TLS encrypt
24         | NGINX            | Send to client
26         | Client           | Receive response
-----------|------------------|----------------------------------------
Total: 26ms (cached request)
```

**Cache Miss Timeline:**
```
Time (ms)  | Component        | Action
-----------|------------------|----------------------------------------
0-8        | [Same as above]  | Up to AQS receive
10         | AQS              | Check Redis cache
12         | Redis            | Cache MISS
14         | AQS              | Call bank adapter
16         | AQS              | Circuit breaker check (CLOSED)
18         | Bank Service     | Receive request
20         | Bank Service     | Process (mock delay: 50ms)
70         | Bank Service     | Return account data
72         | AQS              | Map backend → canonical
74         | AQS              | Store in Redis (TTL: 300s)
76         | AQS              | Add telemetry
78         | AQS              | Send response
80-90      | NGINX            | Compress, headers, encrypt
92         | Client           | Receive response
-----------|------------------|----------------------------------------
Total: 92ms (fresh request)
```

---

## Performance Optimization Features

### Connection Pooling

```
Client Requests:
Req1 → ┐
Req2 → ├─→ NGINX ─→ [Connection Pool: 32 connections] ─→ AQS
Req3 → ┘                    ↑
                            └─ Reused connections
                               (no TCP handshake overhead)
```

### HTTP/2 Multiplexing

```
Browser:
├─ GET /                  ┐
├─ GET /static/app.js     │
├─ GET /static/app.css    ├─→ Single TCP connection
├─ GET /api/accounts/1    │   (HTTP/2 multiplexing)
└─ GET /api/accounts/2    ┘
```

### Gzip Compression

```
Backend Response: 15KB JSON
        ↓
NGINX Gzip (level 6)
        ↓
Client Receives: 3KB (80% savings)
```

---

## Summary

### Security Layers
1. **TLS/HTTPS** - All traffic encrypted
2. **Rate Limiting** - Prevent abuse
3. **IP Whitelisting** - Network-level access control
4. **JWT Authentication** - Application-level auth
5. **Security Headers** - Browser protection (XSS, clickjacking)

### Performance Features
1. **Connection Pooling** - Reuse backend connections
2. **HTTP/2** - Multiplexed requests
3. **Gzip Compression** - Reduce bandwidth
4. **Static Caching** - Browser-side caching
5. **Keep-Alive** - Persistent connections

### Resilience Features
1. **Load Balancing** - Distribute traffic
2. **Health Checks** - Auto-failover
3. **Circuit Breakers** - Fast failure (in AQS)
4. **Timeouts** - Prevent hanging requests
5. **Retries** - Automatic retry on errors

---

**For more details:**
- Configuration: `nginx/README.md`
- Quick reference: `nginx/QUICK_REFERENCE.md`
- Testing: `nginx/test-nginx.sh`
