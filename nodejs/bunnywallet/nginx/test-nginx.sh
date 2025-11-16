#!/bin/bash
# NGINX Integration Test Script
# Tests all major features of the NGINX gateway

set -e

NGINX_HOST="localhost"
NGINX_HTTPS="https://${NGINX_HOST}"
NGINX_HTTP="http://${NGINX_HOST}"
NGINX_HEALTH="http://${NGINX_HOST}:8081"

echo "🧪 NGINX API Gateway Test Suite"
echo "================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() {
    echo -e "${GREEN}✓${NC} $1"
}

fail() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

info() {
    echo -e "ℹ $1"
}

# Test 1: NGINX Health Check
echo "Test 1: NGINX Health Check"
if curl -sf "${NGINX_HEALTH}/nginx-health" > /dev/null 2>&1; then
    pass "NGINX is healthy"
else
    fail "NGINX health check failed"
fi
echo ""

# Test 2: HTTP to HTTPS Redirect
echo "Test 2: HTTP → HTTPS Redirect"
REDIRECT=$(curl -sI "${NGINX_HTTP}" | grep -i "Location" | grep "https" || echo "")
if [ -n "$REDIRECT" ]; then
    pass "HTTP redirects to HTTPS"
else
    fail "HTTP redirect not working"
fi
echo ""

# Test 3: HTTPS Connection
echo "Test 3: HTTPS Connection"
if curl -k -sf "${NGINX_HTTPS}" > /dev/null 2>&1; then
    pass "HTTPS connection successful"
else
    fail "HTTPS connection failed"
fi
echo ""

# Test 4: Security Headers
echo "Test 4: Security Headers"
HEADERS=$(curl -k -sI "${NGINX_HTTPS}")

if echo "$HEADERS" | grep -q "Strict-Transport-Security"; then
    pass "HSTS header present"
else
    fail "HSTS header missing"
fi

if echo "$HEADERS" | grep -q "X-Frame-Options"; then
    pass "X-Frame-Options header present"
else
    warn "X-Frame-Options header missing"
fi

if echo "$HEADERS" | grep -q "X-Content-Type-Options"; then
    pass "X-Content-Type-Options header present"
else
    warn "X-Content-Type-Options header missing"
fi

if echo "$HEADERS" | grep -q "X-Request-ID"; then
    pass "X-Request-ID header present"
else
    warn "X-Request-ID header missing"
fi
echo ""

# Test 5: API Endpoint (requires AQS to be running)
echo "Test 5: API Endpoint Accessibility"
if curl -k -sf "${NGINX_HTTPS}/healthz" > /dev/null 2>&1; then
    pass "API health endpoint accessible"
else
    warn "API health endpoint not accessible (AQS may not be running)"
fi
echo ""

# Test 6: Rate Limiting
echo "Test 6: Rate Limiting"
info "Sending 150 requests to test rate limit (100/s + burst 20)..."

SUCCESS_COUNT=0
RATE_LIMITED=0

for i in {1..150}; do
    STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" "${NGINX_HTTPS}/healthz")
    if [ "$STATUS" = "200" ]; then
        ((SUCCESS_COUNT++))
    elif [ "$STATUS" = "429" ]; then
        ((RATE_LIMITED++))
    fi
done

info "Successful requests: $SUCCESS_COUNT"
info "Rate limited (429): $RATE_LIMITED"

if [ $RATE_LIMITED -gt 0 ]; then
    pass "Rate limiting is working"
else
    warn "Rate limiting may not be working (expected some 429 responses)"
fi
echo ""

# Test 7: Static File Caching Headers
echo "Test 7: Static Asset Caching"
# Test a static file (CSS/JS would have cache headers)
CACHE_HEADERS=$(curl -k -sI "${NGINX_HTTPS}/static/test.css" 2>/dev/null || echo "")
if echo "$CACHE_HEADERS" | grep -q "Cache-Control"; then
    pass "Cache-Control headers present for static assets"
else
    info "Static asset caching not tested (no static files found)"
fi
echo ""

# Test 8: Gzip Compression
echo "Test 8: Gzip Compression"
GZIP_RESPONSE=$(curl -k -sI -H "Accept-Encoding: gzip" "${NGINX_HTTPS}" 2>/dev/null || echo "")
if echo "$GZIP_RESPONSE" | grep -q "Content-Encoding: gzip"; then
    pass "Gzip compression enabled"
else
    info "Gzip compression not detected (may depend on content type)"
fi
echo ""

# Test 9: SSL/TLS Configuration
echo "Test 9: SSL/TLS Configuration"
if command -v openssl > /dev/null 2>&1; then
    TLS_VERSION=$(echo | openssl s_client -connect ${NGINX_HOST}:443 -tls1_2 2>/dev/null | grep "Protocol" || echo "")
    if echo "$TLS_VERSION" | grep -q "TLSv1.2\|TLSv1.3"; then
        pass "TLS 1.2/1.3 supported"
    else
        warn "TLS version check inconclusive"
    fi
else
    info "OpenSSL not available for TLS testing"
fi
echo ""

# Test 10: Health Status Endpoint
echo "Test 10: NGINX Status Endpoint"
if curl -sf "${NGINX_HEALTH}/nginx-status" > /dev/null 2>&1; then
    pass "NGINX status endpoint accessible"
    STATUS_DATA=$(curl -s "${NGINX_HEALTH}/nginx-status")
    info "Active connections: $(echo "$STATUS_DATA" | grep -o 'Active connections: [0-9]*' || echo 'N/A')"
else
    warn "NGINX status endpoint not accessible (may be IP restricted)"
fi
echo ""

# Summary
echo "================================="
echo "✅ Test Suite Complete"
echo ""
echo "Next steps:"
echo "  1. Check logs: docker logs bunnywallet-nginx"
echo "  2. View metrics: curl http://localhost:8081/nginx-status"
echo "  3. Access app: https://localhost (accept cert warning)"
echo ""
echo "For detailed testing, see nginx/README.md"
