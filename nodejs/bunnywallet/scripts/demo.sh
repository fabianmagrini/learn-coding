#!/bin/bash

# Demo script for BunnyWallet

set -e

BASE_URL="${BASE_URL:-http://localhost:8080}"
JWT_SECRET="${JWT_SECRET:-dev-secret-key-change-in-production}"

echo "BunnyWallet Demo Script"
echo "======================="
echo ""

# Generate admin token
echo "Generating admin token..."
TOKEN=$(node -e "const jwt = require('jsonwebtoken'); console.log(jwt.sign({ sub: 'demo-admin', scopes: ['accounts:read', 'admin:simulate', 'admin:cache'] }, '$JWT_SECRET', { expiresIn: '24h' }))")

echo "Token generated: ${TOKEN:0:20}..."
echo ""

# Function to make API calls
api_call() {
  local method=$1
  local endpoint=$2
  local data=$3

  if [ -z "$data" ]; then
    curl -s -X $method \
      -H "Authorization: Bearer $TOKEN" \
      "$BASE_URL$endpoint" | jq '.'
  else
    curl -s -X $method \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$BASE_URL$endpoint" | jq '.'
  fi
}

echo "=== Demo Scenario 1: Single Account Query ==="
echo ""
echo "Fetching BNK-001 (should be cache miss, ~100ms)..."
api_call GET "/v1/accounts/BNK-001"
echo ""

echo "Fetching BNK-001 again (should be cache hit, <10ms)..."
api_call GET "/v1/accounts/BNK-001"
echo ""

echo "=== Demo Scenario 2: Multi-Account Query ==="
echo ""
echo "Fetching multiple accounts..."
api_call GET "/v1/accounts?ids=BNK-001,CC-001,LOAN-001,INV-001"
echo ""

echo "=== Demo Scenario 3: Backend Simulation ==="
echo ""
echo "Making loan service slow (2s latency)..."
api_call POST "/v1/admin/backends/loan/simulate" '{"mode":"slow","latencyMs":2000}'
echo ""

echo "Querying loan account (should timeout or be slow)..."
api_call GET "/v1/accounts/LOAN-001"
echo ""

echo "Resetting loan service to healthy..."
api_call POST "/v1/admin/backends/loan/simulate" '{"mode":"healthy"}'
echo ""

echo "=== Demo Scenario 4: Cache Invalidation ==="
echo ""
echo "Invalidating BNK-001 cache..."
api_call POST "/v1/admin/cache/invalidate/BNK-001"
echo ""

echo "=== Demo Complete ==="
echo ""
echo "Try exploring these endpoints:"
echo "  - GET  $BASE_URL/v1/accounts/{accountId}"
echo "  - GET  $BASE_URL/v1/accounts?ids=..."
echo "  - POST $BASE_URL/v1/admin/backends/{backend}/simulate"
echo "  - GET  $BASE_URL/metrics (Prometheus metrics)"
echo "  - GET  $BASE_URL/v1/admin/health"
echo ""
