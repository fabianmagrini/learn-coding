#!/bin/bash

# Onya Chatbot - Comprehensive Test Suite Runner
# This script runs all tests across the entire system

set -e

echo "🧪 Running comprehensive test suite for Onya chatbot system..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0

run_test_suite() {
    local suite_name="$1"
    local test_command="$2"
    local test_dir="$3"
    
    echo -e "\n${BLUE}📋 Running $suite_name...${NC}"
    echo "----------------------------------------"
    
    cd "$test_dir"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ $suite_name PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ $suite_name FAILED${NC}"
        ((TESTS_FAILED++))
    fi
    
    cd - > /dev/null
}

# Ensure we're in the project root
cd "$(dirname "$0")"

echo -e "${YELLOW}🔧 Installing dependencies...${NC}"

# Install dependencies for all packages
echo "Installing shared services dependencies..."
cd services/shared-services && npm install --silent && cd ../..

echo "Installing customer BFF dependencies..."
cd bffs/customer-bff && npm install --silent && cd ../..

echo "Installing operator BFF dependencies..."
cd bffs/operator-bff && npm install --silent && cd ../..

echo "Installing customer app dependencies..."
cd apps/customer-app && npm install --silent && cd ../..

echo "Installing operator app dependencies..."
cd apps/operator-app && npm install --silent && cd ../..

echo "Installing E2E test dependencies..."
cd tests/e2e && npm install --silent && cd ../..

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Run all test suites
echo -e "\n${YELLOW}🚀 Starting test execution...${NC}"

# 1. Unit Tests - Shared Services
run_test_suite "Shared Services Unit Tests" "npm test" "services/shared-services"

# 2. Unit Tests - Customer BFF
run_test_suite "Customer BFF Unit Tests" "npm test" "bffs/customer-bff"

# 3. Unit Tests - Operator BFF  
run_test_suite "Operator BFF Unit Tests" "npm test" "bffs/operator-bff"

# 4. Component Tests - Customer App
run_test_suite "Customer App Component Tests" "npm test" "apps/customer-app"

# 5. Component Tests - Operator App
run_test_suite "Operator App Component Tests" "npm test" "apps/operator-app"

# 6. E2E Tests (if services are running)
echo -e "\n${BLUE}🌐 Checking if services are available for E2E tests...${NC}"

if curl -f -s http://localhost:3000/health > /dev/null && \
   curl -f -s http://localhost:3001/health > /dev/null && \
   curl -f -s http://localhost:3002/health > /dev/null && \
   curl -f -s http://localhost:5173 > /dev/null && \
   curl -f -s http://localhost:5174 > /dev/null; then
    
    echo -e "${GREEN}✅ All services are running, executing E2E tests...${NC}"
    run_test_suite "End-to-End Tests" "npm test" "tests/e2e"
else
    echo -e "${YELLOW}⚠️  Some services are not running, skipping E2E tests${NC}"
    echo "To run E2E tests, start all services with: docker-compose up -d"
fi

# Test Summary
echo -e "\n${YELLOW}📊 TEST SUMMARY${NC}"
echo "=================================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED! 🎉${NC}"
    echo "The Onya chatbot system is ready for production."
    exit 0
else
    echo -e "\n${RED}💥 SOME TESTS FAILED 💥${NC}"
    echo "Please review the failed tests and fix issues before deployment."
    exit 1
fi