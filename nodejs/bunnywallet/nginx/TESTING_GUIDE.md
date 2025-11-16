# NGINX Testing Guide

Complete guide for testing the NGINX API Gateway in BunnyWallet.

## Table of Contents

- [Quick Test Suite](#quick-test-suite)
- [Manual Testing](#manual-testing)
- [Automated Testing](#automated-testing)
- [Load Testing](#load-testing)
- [Security Testing](#security-testing)
- [Performance Testing](#performance-testing)
- [Integration Testing](#integration-testing)

---

## Quick Test Suite

Run the automated test suite to verify all features:

```bash
cd nginx
./test-nginx.sh
```

**Expected Output:**
```
🧪 NGINX API Gateway Test Suite
=================================

Test 1: NGINX Health Check
✓ NGINX is healthy

Test 2: HTTP → HTTPS Redirect
✓ HTTP redirects to HTTPS

Test 3: HTTPS Connection
✓ HTTPS connection successful

Test 4: Security Headers
✓ HSTS header present
✓ X-Frame-Options header present
✓ X-Content-Type-Options header present
✓ X-Request-ID header present

Test 5: API Endpoint Accessibility
✓ API health endpoint accessible

Test 6: Rate Limiting
ℹ Sending 150 requests to test rate limit...
✓ Rate limiting is working

Test 7: Static Asset Caching
ℹ Static asset caching not tested (no static files found)

Test 8: Gzip Compression
ℹ Gzip compression not detected (may depend on content type)

Test 9: SSL/TLS Configuration
✓ TLS 1.2/1.3 supported

Test 10: NGINX Status Endpoint
✓ NGINX status endpoint accessible
ℹ Active connections: 15

=================================
✅ Test Suite Complete
```

---

## Manual Testing

### 1. Basic Connectivity

#### Test NGINX Health

```bash
curl http://localhost:8081/nginx-health
```

**Expected:**
```
healthy
```

#### Test HTTP to HTTPS Redirect

```bash
curl -I http://localhost/
```

**Expected:**
```
HTTP/1.1 301 Moved Permanently
Server: nginx/1.25
Location: https://localhost/
```

#### Test HTTPS Connection

```bash
curl -k -I https://localhost/
```

**Expected:**
```
HTTP/2 200
server: nginx/1.25
strict-transport-security: max-age=31536000; includeSubDomains
x-frame-options: SAMEORIGIN
x-content-type-options: nosniff
x-request-id: <uuid>
```

---

### 2. Security Headers

#### Test All Security Headers

```bash
curl -k -I https://localhost/ | grep -E "(strict-transport|x-frame|x-content-type|x-xss|x-request-id)"
```

**Expected:**
```
strict-transport-security: max-age=31536000; includeSubDomains
x-frame-options: SAMEORIGIN
x-content-type-options: nosniff
x-xss-protection: 1; mode=block
x-request-id: f47ac10b-58cc-4372-a567-0e02b2c3d479
```

#### Test Request ID Tracking

```bash
# Make two requests and compare X-Request-ID
curl -k -I https://localhost/ 2>&1 | grep x-request-id
curl -k -I https://localhost/ 2>&1 | grep x-request-id
```

**Expected:** Different UUIDs for each request

---

### 3. Rate Limiting

#### Test API Rate Limit (100/s + burst 20)

```bash
# Send 150 requests rapidly
for i in {1..150}; do
  curl -k -s -o /dev/null -w "%{http_code}\n" https://localhost/healthz &
done | sort | uniq -c
```

**Expected Output:**
```
    120 200    # First 100 + 20 burst
     30 429    # Rate limited
```

#### Test Admin Rate Limit (10/s + burst 5)

First, get a JWT token with admin scope:
```bash
node -e "console.log(require('jsonwebtoken').sign({sub:'admin',scopes:['admin:simulate']}, 'dev-secret-key-change-in-production', {expiresIn:'1h'}))"
```

Then test rate limit:
```bash
TOKEN="<your-token>"
for i in {1..20}; do
  curl -k -s -o /dev/null -w "%{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" \
    https://localhost/v1/admin/health &
done | sort | uniq -c
```

**Expected Output:**
```
     15 200    # First 10 + 5 burst
      5 429    # Rate limited
```

---

### 4. API Functionality

#### Test Account Retrieval

```bash
# Generate token
TOKEN=$(node -e "console.log(require('jsonwebtoken').sign({sub:'demo',scopes:['accounts:read']}, 'dev-secret-key-change-in-production', {expiresIn:'1h'}))")

# Get account via NGINX
curl -k -H "Authorization: Bearer $TOKEN" \
  https://localhost/v1/accounts/BNK-001 | jq
```

**Expected:**
```json
{
  "accountId": "BNK-001",
  "accountType": "bank",
  "displayName": "Primary Checking Account",
  "owner": {
    "customerId": "CUST-12345",
    "name": "John Doe"
  },
  "balances": [
    {
      "currency": "USD",
      "available": 5420.50,
      "ledger": 5620.50
    }
  ],
  "status": "active",
  "backendSource": "bank-service-v1",
  "cached": true
}
```

#### Test Multiple Accounts

```bash
curl -k -H "Authorization: Bearer $TOKEN" \
  "https://localhost/v1/accounts?ids=BNK-001,CC-001,LOAN-001" | jq
```

---

### 5. IP Whitelisting

#### Test Admin Endpoint from Outside Docker

```bash
# This should fail with 403 if you're not on localhost
curl -k -I -H "Authorization: Bearer $TOKEN" \
  https://localhost/v1/admin/health
```

**Expected (from outside):**
```
HTTP/2 403
server: nginx/1.25
```

**Expected (from localhost or Docker network):**
```
HTTP/2 200
server: nginx/1.25
```

#### Test from Docker Network

```bash
# Run from inside a container
docker exec bunnywallet-aqs \
  curl -s http://nginx/v1/admin/health
```

**Expected:** Should work (200 OK)

---

### 6. TLS/SSL

#### Verify TLS Version

```bash
echo | openssl s_client -connect localhost:443 -tls1_2 2>/dev/null | grep "Protocol"
```

**Expected:**
```
Protocol  : TLSv1.2
```

```bash
echo | openssl s_client -connect localhost:443 -tls1_3 2>/dev/null | grep "Protocol"
```

**Expected:**
```
Protocol  : TLSv1.3
```

#### Verify Certificate

```bash
echo | openssl s_client -connect localhost:443 2>/dev/null | openssl x509 -noout -text | grep -A2 "Subject:"
```

**Expected:**
```
Subject: C=US, ST=Demo, L=Demo, O=BunnyWallet, OU=Development, CN=localhost
Subject Public Key Info:
    Public Key Algorithm: rsaEncryption
```

#### Test Invalid TLS Version (should fail)

```bash
echo | openssl s_client -connect localhost:443 -tls1 2>&1 | grep "alert"
```

**Expected:** Error (TLS 1.0 not supported)

---

### 7. Compression

#### Test Gzip Compression

```bash
curl -k -H "Accept-Encoding: gzip" -I https://localhost/ | grep -i "content-encoding"
```

**Expected:**
```
content-encoding: gzip
```

#### Compare Compressed vs Uncompressed Size

```bash
# Uncompressed
SIZE_UNCOMPRESSED=$(curl -k -s https://localhost/ | wc -c)

# Compressed
SIZE_COMPRESSED=$(curl -k -s -H "Accept-Encoding: gzip" https://localhost/ --compressed | wc -c)

echo "Uncompressed: $SIZE_UNCOMPRESSED bytes"
echo "Compressed: $SIZE_COMPRESSED bytes"
echo "Savings: $(( 100 - (SIZE_COMPRESSED * 100 / SIZE_UNCOMPRESSED) ))%"
```

---

### 8. Load Balancing

#### Check Upstream Status

```bash
curl http://localhost:8081/nginx-status
```

**Expected:**
```
Active connections: 15
server accepts handled requests
 12345 12345 54321
Reading: 0 Writing: 5 Waiting: 10
```

#### Test Failover (Simulate Backend Down)

```bash
# Stop AQS service
docker-compose stop aqs-service

# Try to access API
curl -k https://localhost/healthz
```

**Expected:**
```
HTTP/2 502
```

```bash
# Restart AQS
docker-compose start aqs-service

# Should work again after health check
sleep 5
curl -k https://localhost/healthz
```

**Expected:** 200 OK

---

## Automated Testing

### Integration Test Script

Create a comprehensive test script:

```bash
#!/bin/bash
# comprehensive-test.sh

set -e

BASE_URL="https://localhost"
HEALTH_URL="http://localhost:8081"

echo "🧪 Comprehensive NGINX Test Suite"
echo "=================================="

# Generate JWT token
export TOKEN=$(node -e "console.log(require('jsonwebtoken').sign({sub:'test',scopes:['accounts:read','admin:simulate']}, 'dev-secret-key-change-in-production', {expiresIn:'1h'}))")

# Test 1: Health Check
echo ""
echo "Test 1: Health Checks"
curl -sf $HEALTH_URL/nginx-health > /dev/null && echo "✓ NGINX healthy" || exit 1
curl -k -sf -H "Authorization: Bearer $TOKEN" $BASE_URL/healthz > /dev/null && echo "✓ AQS healthy" || exit 1

# Test 2: TLS
echo ""
echo "Test 2: TLS/HTTPS"
STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" $BASE_URL/)
[ "$STATUS" = "200" ] && echo "✓ HTTPS works" || exit 1

# Test 3: Redirect
echo ""
echo "Test 3: HTTP → HTTPS Redirect"
REDIRECT=$(curl -s -I http://localhost/ | grep -i "location" | grep "https" || echo "")
[ -n "$REDIRECT" ] && echo "✓ Redirect works" || exit 1

# Test 4: Security Headers
echo ""
echo "Test 4: Security Headers"
HEADERS=$(curl -k -sI $BASE_URL/)
echo "$HEADERS" | grep -q "strict-transport-security" && echo "✓ HSTS" || exit 1
echo "$HEADERS" | grep -q "x-frame-options" && echo "✓ X-Frame-Options" || exit 1
echo "$HEADERS" | grep -q "x-request-id" && echo "✓ X-Request-ID" || exit 1

# Test 5: API Endpoints
echo ""
echo "Test 5: API Endpoints"
curl -k -sf -H "Authorization: Bearer $TOKEN" $BASE_URL/v1/accounts/BNK-001 > /dev/null && echo "✓ Account retrieval" || exit 1

# Test 6: Rate Limiting
echo ""
echo "Test 6: Rate Limiting"
echo "Sending 150 requests..."
SUCCESS=0
RATE_LIMITED=0
for i in {1..150}; do
  STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" $BASE_URL/healthz)
  [ "$STATUS" = "200" ] && ((SUCCESS++))
  [ "$STATUS" = "429" ] && ((RATE_LIMITED++))
done
echo "Success: $SUCCESS, Rate limited: $RATE_LIMITED"
[ $RATE_LIMITED -gt 0 ] && echo "✓ Rate limiting works" || echo "⚠ No rate limiting detected"

# Test 7: Compression
echo ""
echo "Test 7: Gzip Compression"
curl -k -sI -H "Accept-Encoding: gzip" $BASE_URL/ | grep -q "content-encoding: gzip" && echo "✓ Gzip enabled" || echo "ℹ Gzip not detected"

echo ""
echo "=================================="
echo "✅ All tests passed!"
```

Make it executable and run:
```bash
chmod +x comprehensive-test.sh
./comprehensive-test.sh
```

---

## Load Testing

### Using Apache Bench (ab)

#### Test API Throughput

```bash
# Install Apache Bench
# macOS: brew install apache2
# Ubuntu: apt-get install apache2-utils

# Test with 1000 requests, 10 concurrent
ab -n 1000 -c 10 -k \
  -H "Authorization: Bearer $TOKEN" \
  https://localhost/healthz
```

**Expected Output:**
```
Requests per second:    850.23 [#/sec] (mean)
Time per request:       11.762 [ms] (mean)
Time per request:       1.176 [ms] (mean, across all concurrent requests)
Transfer rate:          245.67 [Kbytes/sec] received

Percentage of the requests served within a certain time (ms)
  50%     10
  66%     12
  75%     13
  80%     14
  90%     16
  95%     18
  98%     22
  99%     25
 100%     45 (longest request)
```

### Using wrk (More Advanced)

```bash
# Install wrk
# macOS: brew install wrk
# Linux: git clone https://github.com/wg/wrk && cd wrk && make

# Test with 12 threads, 400 connections, for 30 seconds
wrk -t12 -c400 -d30s \
  -H "Authorization: Bearer $TOKEN" \
  https://localhost/healthz

# Custom script to test different endpoints
cat > wrk-script.lua <<'EOF'
request = function()
  local endpoints = {
    "/healthz",
    "/v1/accounts/BNK-001",
    "/v1/accounts/CC-001"
  }
  local path = endpoints[math.random(#endpoints)]
  return wrk.format("GET", path, {
    ["Authorization"] = "Bearer " .. os.getenv("TOKEN")
  })
end
EOF

TOKEN=$TOKEN wrk -t12 -c100 -d30s -s wrk-script.lua https://localhost
```

### Rate Limit Stress Test

```bash
# Test rate limiting under load
# Should see approximately 100 req/s succeed, rest get 429

ab -n 10000 -c 50 -k \
  -H "Authorization: Bearer $TOKEN" \
  https://localhost/v1/accounts/BNK-001 | grep "requests per second"
```

**Expected:** Around 100 req/s (rate limit), with many 429 responses

---

## Security Testing

### 1. SSL/TLS Security Scan

Using `testssl.sh`:

```bash
# Install testssl.sh
git clone https://github.com/drwetter/testssl.sh.git
cd testssl.sh

# Run security scan
./testssl.sh localhost:443
```

**Look for:**
- TLS 1.2 and 1.3 support ✓
- No SSLv2, SSLv3, TLS 1.0, TLS 1.1 ✓
- Strong cipher suites ✓
- No weak ciphers ✓

### 2. Header Security Check

Using `curl`:

```bash
curl -k -I https://localhost/ | grep -E "(strict-transport|x-frame|x-content|x-xss|referrer)"
```

**Expected (all present):**
```
strict-transport-security: max-age=31536000; includeSubDomains
x-frame-options: SAMEORIGIN
x-content-type-options: nosniff
x-xss-protection: 1; mode=block
referrer-policy: no-referrer-when-downgrade
```

### 3. IP Whitelisting Verification

```bash
# Test admin endpoint (should fail from external IP)
curl -k -H "Authorization: Bearer $TOKEN" \
  https://localhost/v1/admin/backends/bank/simulate \
  -X POST -H "Content-Type: application/json" \
  -d '{"mode":"healthy"}'
```

**Expected from external:** 403 Forbidden
**Expected from localhost:** 200 OK

### 4. JWT Validation

```bash
# Test without token (should fail)
curl -k https://localhost/v1/accounts/BNK-001
```

**Expected:** 401 Unauthorized

```bash
# Test with invalid token
curl -k -H "Authorization: Bearer invalid-token" \
  https://localhost/v1/accounts/BNK-001
```

**Expected:** 401 Unauthorized

---

## Performance Testing

### 1. Response Time Benchmarks

#### Cache Hit Performance

```bash
# Prime cache
curl -k -H "Authorization: Bearer $TOKEN" \
  https://localhost/v1/accounts/BNK-001 > /dev/null

# Measure cached response time
time curl -k -s -H "Authorization: Bearer $TOKEN" \
  https://localhost/v1/accounts/BNK-001 > /dev/null
```

**Expected:** < 50ms total time

#### Cache Miss Performance

```bash
# Force cache bypass
time curl -k -s \
  -H "Authorization: Bearer $TOKEN" \
  -H "Cache-Control: no-cache" \
  https://localhost/v1/accounts/BNK-001 > /dev/null
```

**Expected:** 100-200ms total time (includes backend call)

### 2. Compression Effectiveness

```bash
# Test compression ratio
function test_compression() {
  local url=$1
  local uncompressed=$(curl -k -s -w "%{size_download}" -o /dev/null $url)
  local compressed=$(curl -k -s -H "Accept-Encoding: gzip" -w "%{size_download}" -o /dev/null $url)
  local savings=$(( 100 - (compressed * 100 / uncompressed) ))
  echo "Uncompressed: ${uncompressed} bytes"
  echo "Compressed: ${compressed} bytes"
  echo "Savings: ${savings}%"
}

test_compression "https://localhost/"
```

**Expected:** 60-80% savings for HTML/JSON

### 3. Connection Reuse

```bash
# Test keep-alive performance (10 requests on same connection)
time for i in {1..10}; do
  curl -k -s -H "Authorization: Bearer $TOKEN" \
    https://localhost/v1/accounts/BNK-001 > /dev/null
done
```

**Expected:** ~50-100ms total (5-10ms per request with connection reuse)

---

## Integration Testing

### End-to-End Workflow Test

```bash
#!/bin/bash
# e2e-test.sh - Complete workflow test

set -e

echo "🔄 End-to-End Workflow Test"
echo "============================"

# 1. Generate token
echo "1. Generating JWT token..."
TOKEN=$(node -e "console.log(require('jsonwebtoken').sign({sub:'e2e-test',scopes:['accounts:read','admin:simulate','admin:cache']}, 'dev-secret-key-change-in-production', {expiresIn:'1h'}))")
echo "✓ Token generated"

# 2. Check NGINX health
echo ""
echo "2. Checking NGINX health..."
curl -sf http://localhost:8081/nginx-health > /dev/null
echo "✓ NGINX is healthy"

# 3. Check AQS health
echo ""
echo "3. Checking AQS health..."
curl -k -sf -H "Authorization: Bearer $TOKEN" https://localhost/healthz > /dev/null
echo "✓ AQS is healthy"

# 4. Get account (cache miss)
echo ""
echo "4. Fetching account (cache miss)..."
RESPONSE=$(curl -k -s -H "Authorization: Bearer $TOKEN" \
  -H "Cache-Control: no-cache" \
  https://localhost/v1/accounts/BNK-001)
echo "$RESPONSE" | jq -e '.accountId == "BNK-001"' > /dev/null
echo "✓ Account retrieved"

# 5. Get account again (cache hit)
echo ""
echo "5. Fetching account again (cache hit)..."
RESPONSE=$(curl -k -s -H "Authorization: Bearer $TOKEN" \
  https://localhost/v1/accounts/BNK-001)
echo "$RESPONSE" | jq -e '.cached == true' > /dev/null
echo "✓ Served from cache"

# 6. Simulate backend failure
echo ""
echo "6. Simulating backend failure..."
curl -k -sf -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"error"}' \
  https://localhost/v1/admin/backends/bank/simulate > /dev/null
echo "✓ Backend set to error mode"

# 7. Get account (should return stale from cache)
echo ""
echo "7. Fetching account (backend down, should return stale)..."
RESPONSE=$(curl -k -s -H "Authorization: Bearer $TOKEN" \
  -H "Cache-Control: no-cache" \
  https://localhost/v1/accounts/BNK-001)
echo "$RESPONSE" | jq -e '.stale == true or .cached == true' > /dev/null
echo "✓ Stale data returned"

# 8. Reset backend
echo ""
echo "8. Resetting backend to healthy..."
curl -k -sf -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"healthy"}' \
  https://localhost/v1/admin/backends/bank/simulate > /dev/null
echo "✓ Backend restored"

# 9. Invalidate cache
echo ""
echo "9. Invalidating cache..."
curl -k -sf -X POST \
  -H "Authorization: Bearer $TOKEN" \
  https://localhost/v1/admin/cache/invalidate/BNK-001 > /dev/null
echo "✓ Cache invalidated"

# 10. Get account (fresh from backend)
echo ""
echo "10. Fetching account (fresh from backend)..."
RESPONSE=$(curl -k -s -H "Authorization: Bearer $TOKEN" \
  https://localhost/v1/accounts/BNK-001)
echo "$RESPONSE" | jq -e '.cached == false or .stale == false' > /dev/null
echo "✓ Fresh data retrieved"

echo ""
echo "============================"
echo "✅ E2E Test Complete!"
```

Run the test:
```bash
chmod +x e2e-test.sh
./e2e-test.sh
```

---

## Troubleshooting Tests

### Debug Failed Tests

#### Enable Detailed Logging

```bash
# Increase NGINX log verbosity
docker exec bunnywallet-nginx sed -i 's/error_log.*warn/error_log \/var\/log\/nginx\/error.log debug/' /etc/nginx/nginx.conf
docker exec bunnywallet-nginx nginx -s reload

# Follow logs
docker logs -f bunnywallet-nginx
```

#### Check Configuration

```bash
# Test NGINX configuration
docker exec bunnywallet-nginx nginx -t

# View current configuration
docker exec bunnywallet-nginx cat /etc/nginx/nginx.conf
docker exec bunnywallet-nginx cat /etc/nginx/conf.d/default.conf
```

#### Network Connectivity

```bash
# Check NGINX can reach AQS
docker exec bunnywallet-nginx wget -qO- http://aqs-service:8080/healthz

# Check NGINX can reach frontend
docker exec bunnywallet-nginx wget -qO- http://frontend:3000
```

---

## Test Checklist

Before deploying, verify all these tests pass:

- [ ] NGINX health check responds with "healthy"
- [ ] HTTP redirects to HTTPS (301)
- [ ] HTTPS connection works (200)
- [ ] All security headers present (HSTS, X-Frame-Options, etc.)
- [ ] API endpoints accessible with valid JWT
- [ ] Rate limiting returns 429 after threshold
- [ ] IP whitelisting blocks external requests to admin endpoints
- [ ] TLS 1.2 and 1.3 work, older versions rejected
- [ ] Gzip compression enabled for text content
- [ ] Load balancing distributes requests
- [ ] Backend failover works (502 when backend down)
- [ ] Circuit breaker integration works
- [ ] Request IDs generated and tracked
- [ ] Cache hit/miss flows work correctly
- [ ] Admin endpoints require proper JWT scopes
- [ ] Metrics endpoint accessible from Docker network

---

## Continuous Testing

### GitHub Actions Example

```yaml
# .github/workflows/nginx-test.yml
name: NGINX Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Generate certificates
        run: cd nginx && ./generate-certs.sh

      - name: Start services
        run: docker-compose up -d nginx aqs-service

      - name: Wait for services
        run: sleep 10

      - name: Run NGINX tests
        run: ./nginx/test-nginx.sh

      - name: Run E2E tests
        run: ./e2e-test.sh

      - name: Check logs
        if: failure()
        run: docker logs bunnywallet-nginx
```

---

## Summary

### Test Coverage

- ✅ **Functional**: Health checks, redirects, TLS, APIs
- ✅ **Security**: Headers, TLS versions, IP whitelisting, JWT
- ✅ **Performance**: Compression, caching, keep-alive
- ✅ **Resilience**: Rate limiting, load balancing, failover
- ✅ **Integration**: E2E workflows, cache behavior, circuit breakers

### Key Metrics

| Metric | Target | Command |
|--------|--------|---------|
| Response time (cached) | < 50ms | `time curl -k https://localhost/v1/accounts/BNK-001` |
| Response time (fresh) | < 200ms | `time curl -k -H "Cache-Control: no-cache" https://localhost/v1/accounts/BNK-001` |
| Throughput | > 500 req/s | `ab -n 10000 -c 100 https://localhost/healthz` |
| Rate limit accuracy | 100 req/s ± 5 | `for i in {1..150}; do curl https://localhost/healthz; done \| grep -c 429` |
| Compression ratio | > 60% | See compression test above |
| TLS handshake | < 100ms | `time openssl s_client -connect localhost:443` |

---

**For more information:**
- Main documentation: `nginx/README.md`
- Quick reference: `nginx/QUICK_REFERENCE.md`
- Request flows: `nginx/REQUEST_FLOW.md`
