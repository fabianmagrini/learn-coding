# Onya E2E Tests

End-to-end tests for the Onya chatbot system using Playwright.

## Overview

This test suite provides comprehensive end-to-end testing of the complete Onya chatbot system, including:

- **Customer chat flow** - Complete customer journey from chat initiation to resolution
- **Operator workflow** - Operator dashboard, chat management, and escalation handling
- **Integration testing** - Multi-user scenarios and real-time communication
- **Performance testing** - Load testing, response times, and system resilience

## Test Structure

```
tests/e2e/
├── tests/
│   ├── customer/           # Customer-facing functionality
│   │   └── chat-flow.spec.ts
│   ├── operator/           # Operator dashboard and workflows
│   │   └── operator-workflow.spec.ts
│   └── integration/        # Cross-system integration tests
│       ├── complete-journey.spec.ts
│       └── performance.spec.ts
├── global-setup.ts         # Global test setup
├── global-teardown.ts      # Global test cleanup
├── playwright.config.ts    # Playwright configuration
└── package.json           # Dependencies and scripts
```

## Prerequisites

1. **All services running**:
   - Shared Services (port 3000)
   - Customer BFF (port 3001)
   - Operator BFF (port 3002)
   - Customer App (port 5173)
   - Operator App (port 5174)

2. **Node.js and npm** installed

3. **Playwright browsers** installed

## Setup

```bash
cd tests/e2e
npm install
npm run install-browsers
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Suites
```bash
# Customer flow tests only
npx playwright test tests/customer/

# Operator workflow tests only
npx playwright test tests/operator/

# Integration tests only
npx playwright test tests/integration/
```

### Development & Debugging
```bash
# Run with UI (interactive mode)
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Debug specific test
npm run test:debug -- tests/customer/chat-flow.spec.ts
```

### With Docker
```bash
# Start services and run tests
npm run test:docker
```

## Test Categories

### Customer Tests (`tests/customer/`)

**chat-flow.spec.ts**
- ✅ Chat session creation and messaging
- ✅ Human escalation request flow
- ✅ Real-time message delivery
- ✅ Keyboard shortcuts and UX
- ✅ Input validation and error handling
- ✅ Chat persistence across page refreshes
- ✅ Mobile responsiveness
- ✅ Service unavailability handling

### Operator Tests (`tests/operator/`)

**operator-workflow.spec.ts**
- ✅ Operator dashboard functionality
- ✅ Chat queue management
- ✅ Accepting and handling customer chats
- ✅ Chat escalation to supervisors
- ✅ Chat transfer between operators
- ✅ Chat resolution and closure
- ✅ Real-time metrics and analytics
- ✅ Operator status management
- ✅ Real-time notifications
- ✅ Tablet responsiveness

### Integration Tests (`tests/integration/`)

**complete-journey.spec.ts**
- ✅ End-to-end customer-to-operator workflow
- ✅ Real-time bidirectional communication
- ✅ Multi-customer concurrent handling
- ✅ Operator handoff with chat history
- ✅ System resilience (operator offline scenarios)
- ✅ Cross-browser compatibility

**performance.spec.ts**
- ✅ Application load time testing
- ✅ Message response time validation
- ✅ Concurrent session handling
- ✅ Escalation workflow performance
- ✅ Real-time messaging performance
- ✅ Large message handling
- ✅ Memory usage stability
- ✅ Network resilience testing

## Browser Coverage

Tests run across multiple browsers and devices:

- **Desktop**: Chrome, Firefox, Safari
- **Mobile**: Chrome on Android, Safari on iOS
- **Tablet**: Responsive layout testing

## Reporting

Test results are generated in multiple formats:

- **HTML Report**: `test-results/html/index.html`
- **JSON Report**: `test-results/results.json`
- **JUnit XML**: `test-results/results.xml`

View HTML report:
```bash
npm run test:report
```

## Performance Benchmarks

### Expected Performance Targets

| Metric | Target | Test Coverage |
|--------|--------|---------------|
| App Load Time | < 5 seconds | ✅ |
| Message Send Time | < 1 second | ✅ |
| Bot Response Time | < 5 seconds | ✅ |
| Escalation Time | < 5 seconds | ✅ |
| Dashboard Load | < 3 seconds | ✅ |
| Concurrent Users | 5+ simultaneous | ✅ |

### Load Testing Scenarios

- **5 concurrent customer sessions**
- **Rapid message sending (5 messages/session)**
- **Simultaneous escalations**
- **Large message handling (1000+ characters)**
- **Extended chat sessions (20+ messages)**

## CI/CD Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions integration
- name: Run E2E Tests
  run: |
    cd tests/e2e
    npm ci
    npm run install-browsers
    npm test
```

## Troubleshooting

### Common Issues

1. **Services not ready**
   - Ensure all 5 services are running on correct ports
   - Check global-setup.ts for service health validation

2. **Flaky tests**
   - Tests include proper wait conditions
   - Increase timeouts if needed for slower environments

3. **Browser issues**
   - Run `npm run install-browsers` to ensure browsers are installed
   - Check Playwright version compatibility

### Debug Commands

```bash
# Check service health
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health

# View test trace
npx playwright show-trace test-results/trace.zip

# Run single test with debug
npx playwright test --debug tests/customer/chat-flow.spec.ts
```

## Test Data Management

Tests use:
- **Mock authentication** for operators
- **Ephemeral sessions** for customers
- **Isolated contexts** for multi-user scenarios
- **Automatic cleanup** after test completion

## Contributing

When adding new E2E tests:

1. **Follow naming convention**: `feature.spec.ts`
2. **Use data-testid attributes** for reliable element selection
3. **Include proper wait conditions** for async operations
4. **Test both happy path and error scenarios**
5. **Consider mobile/responsive testing**
6. **Add performance validations** where appropriate

## Maintenance

Regular maintenance tasks:

- **Update browser versions** monthly
- **Review performance benchmarks** quarterly
- **Update test data** as features evolve
- **Monitor flaky test reports** weekly

This E2E test suite ensures the Onya chatbot system delivers a reliable, performant, and user-friendly experience across all supported platforms and use cases.