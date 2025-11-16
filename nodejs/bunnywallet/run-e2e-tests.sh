#!/bin/bash

# BunnyWallet E2E Test Runner
# This script starts all services and runs the E2E test suite

set -e

echo "🐰 BunnyWallet E2E Test Runner"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose not found. Please install Docker Compose.${NC}"
    exit 1
fi

# Step 1: Start services
echo -e "${YELLOW}📦 Starting Docker Compose services...${NC}"
docker-compose up -d

# Step 2: Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"

# Wait for AQS
MAX_ATTEMPTS=30
ATTEMPT=0
until curl -f http://localhost:8080/healthz > /dev/null 2>&1; do
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
        echo -e "${RED}❌ AQS service did not start in time${NC}"
        docker-compose logs aqs-service
        exit 1
    fi
    echo "Waiting for AQS service... ($ATTEMPT/$MAX_ATTEMPTS)"
    sleep 2
done

echo -e "${GREEN}✅ AQS service is ready${NC}"

# Wait for Jaeger
ATTEMPT=0
until curl -f http://localhost:16686 > /dev/null 2>&1; do
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
        echo -e "${RED}❌ Jaeger service did not start in time${NC}"
        docker-compose logs jaeger
        exit 1
    fi
    echo "Waiting for Jaeger... ($ATTEMPT/$MAX_ATTEMPTS)"
    sleep 2
done

echo -e "${GREEN}✅ Jaeger is ready${NC}"

# Wait for Redis
ATTEMPT=0
until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
        echo -e "${RED}❌ Redis did not start in time${NC}"
        docker-compose logs redis
        exit 1
    fi
    echo "Waiting for Redis... ($ATTEMPT/$MAX_ATTEMPTS)"
    sleep 2
done

echo -e "${GREEN}✅ Redis is ready${NC}"

# Step 3: Run E2E tests
echo -e "${YELLOW}🧪 Running E2E tests...${NC}"
cd aqs-service

if npm run test:e2e; then
    echo -e "${GREEN}✅ All E2E tests passed!${NC}"
    EXIT_CODE=0
else
    echo -e "${RED}❌ Some E2E tests failed${NC}"
    EXIT_CODE=1
fi

cd ..

# Step 4: Cleanup (optional)
if [ "${CLEANUP:-yes}" = "yes" ]; then
    echo -e "${YELLOW}🧹 Cleaning up (set CLEANUP=no to skip)...${NC}"
    docker-compose down
else
    echo -e "${YELLOW}⚠️  Services still running. Run 'docker-compose down' to stop.${NC}"
fi

exit $EXIT_CODE
