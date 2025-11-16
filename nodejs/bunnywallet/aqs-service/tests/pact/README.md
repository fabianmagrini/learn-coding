# Pact Contract Tests

Consumer-Driven Contract Testing for BunnyWallet Account Query Service.

## Overview

**Pact** is a contract testing framework that ensures the AQS adapters (consumers) and mock backend services (providers) stay in sync. Contract tests verify:

1. **Consumer expectations** - AQS adapters define what they expect from backends
2. **Provider compliance** - Mock backends verify they meet those expectations

This prevents integration failures and enables independent deployment of services.

## Architecture

```
┌─────────────────┐                    ┌──────────────────┐
│   AQS Service   │                    │  Bank Service    │
│   (Consumer)    │                    │   (Provider)     │
│                 │                    │                  │
│  BankAdapter ───┼───── Contract ────▶│  GET /accounts   │
│                 │      (Pact File)   │  GET /health     │
└─────────────────┘                    └──────────────────┘
```

**Consumer Test** (AQS): Defines expected interactions and generates pact file
**Provider Test** (Backend): Verifies it satisfies the pact file

## Contract Test Files

### Consumer Contracts
- `bank-adapter.pact.test.ts` - Bank service contract
- `credit-adapter.pact.test.ts` - Credit service contract
- `loan-adapter.pact.test.ts` - Loan service contract
- `investment-adapter.pact.test.ts` - Investment service contract
- `legacy-adapter.pact.test.ts` - Legacy service contract
- `crypto-adapter.pact.test.ts` - Crypto service contract

### Provider Verification
- `provider-verification.test.ts` - Verifies all backends honor contracts

### Generated Pact Files
- `pacts/aqs-service-bank-service.json` - Bank contract
- `pacts/aqs-service-credit-service.json` - Credit contract
- `pacts/aqs-service-loan-service.json` - Loan contract
- `pacts/aqs-service-investment-service.json` - Investment contract
- `pacts/aqs-service-legacy-service.json` - Legacy contract
- `pacts/aqs-service-crypto-service.json` - Crypto contract

## Running Tests

### 1. Consumer Tests (Generate Contracts)

Run consumer tests to generate pact files:

```bash
# Run all consumer tests
npm run test:pact:consumer

# Run specific adapter contract
npx jest tests/pact/bank-adapter.pact.test.ts
npx jest tests/pact/credit-adapter.pact.test.ts
npx jest tests/pact/loan-adapter.pact.test.ts
npx jest tests/pact/investment-adapter.pact.test.ts
npx jest tests/pact/legacy-adapter.pact.test.ts
npx jest tests/pact/crypto-adapter.pact.test.ts
```

This creates pact files in `pacts/` directory.

### 2. Provider Verification

Verify mock backends satisfy the contracts:

```bash
# Start all mock backends first
docker-compose up -d

# Run provider verification for all backends
npm run test:pact:provider

# Or verify specific provider
npx jest tests/pact/provider-verification.test.ts -t "bank-service"
npx jest tests/pact/provider-verification.test.ts -t "credit-service"
npx jest tests/pact/provider-verification.test.ts -t "loan-service"
npx jest tests/pact/provider-verification.test.ts -t "investment-service"
npx jest tests/pact/provider-verification.test.ts -t "legacy-service"
npx jest tests/pact/provider-verification.test.ts -t "crypto-service"
```

### 3. Full Workflow

```bash
# Complete contract testing workflow
npm run test:pact

# This runs:
# 1. Consumer tests (generate contracts)
# 2. Provider verification (verify backends)
```

## Test Structure

### Consumer Test Example

```typescript
describe('Pact Contract: BankAdapter → bank-service', () => {
  const provider = new Pact({
    consumer: 'aqs-service',
    provider: 'bank-service',
    port: 3001,
    dir: path.resolve(process.cwd(), 'pacts'),
  });

  it('should retrieve account successfully', async () => {
    // Define expected interaction
    await provider.addInteraction({
      state: 'account bank-001 exists',
      uponReceiving: 'a request for account bank-001',
      withRequest: {
        method: 'GET',
        path: '/accounts/bank-001',
        headers: { 'X-API-Key': 'bank-demo-key-123' },
      },
      willRespondWith: {
        status: 200,
        body: { /* expected response */ },
      },
    });

    // Execute adapter call against mock
    const adapter = new BankAdapter('http://localhost:3001', 'key');
    const result = await adapter.getSummary('bank-001');

    // Verify expectations
    expect(result.success).toBe(true);
  });
});
```

### Provider Verification Example

```typescript
describe('bank-service provider', () => {
  it('should validate against consumer contract', async () => {
    const verifier = new Verifier({
      provider: 'bank-service',
      providerBaseUrl: 'http://localhost:3001',
      pactUrls: ['pacts/aqs-service-bank-service.json'],
      stateHandlers: {
        'account bank-001 exists': () => {
          // Setup: ensure account exists
          return Promise.resolve();
        },
      },
    });

    await verifier.verifyProvider();
  });
});
```

## Contract Coverage

### Bank Adapter Contract
- ✅ GET /accounts/:accountId - Success (200)
- ✅ GET /accounts/:accountId - Not Found (404)
- ✅ GET /accounts/:accountId - Server Error (500)
- ✅ GET /health - Health Check (200)

### Credit Adapter Contract
- ✅ GET /cards/:cardId - Success (200)
- ✅ GET /cards/:cardId - Not Found (404)
- ✅ GET /health - Health Check (200)

### Loan Adapter Contract
- ✅ GET /loans/:loanId - Success (200)
- ✅ GET /loans/:loanId - Not Found (404)
- ✅ GET /health - Health Check (200)

### Investment Adapter Contract
- ✅ GET /portfolios/:portfolioId - Success (200)
- ✅ GET /portfolios/:portfolioId - Not Found (404)
- ✅ GET /health - Health Check (200)

### Legacy Adapter Contract
- ✅ GET /account/:accountId - Success (200, CSV format)
- ✅ GET /account/:accountId - Not Found (404)
- ✅ GET /health - Health Check (200)

### Crypto Adapter Contract
- ✅ GET /wallets/:walletId - Success (200)
- ✅ GET /wallets/:walletId - Not Found (404)
- ✅ GET /health - Health Check (200)

## Pact Matchers

Pact provides matchers for flexible contract definitions:

```typescript
import { like, term, eachLike } from '@pact-foundation/pact/src/dsl/matchers';

// Type matching (don't care about exact value)
balance: like(15234.56)  // Matches any number

// Regex matching
accountNumber: term({
  generate: '1234567890',
  matcher: '\\d{10}',  // Must be 10 digits
})

// Array matching
transactions: eachLike({
  id: like('txn-001'),
  amount: like(100.50),
})
```

## State Handlers

State handlers prepare the provider for specific test scenarios:

```typescript
stateHandlers: {
  'account bank-001 exists': async () => {
    // Setup: Create/reset test data
    await resetDatabase();
    await createAccount('bank-001');
  },

  'bank service is experiencing errors': async () => {
    // Setup: Configure service to return errors
    await setServiceMode('error');
  },
}
```

## Benefits

### 1. **Catch Breaking Changes Early**
- Backend changes that break consumer expectations fail immediately
- No need to wait for integration testing

### 2. **Independent Development**
- Frontend/AQS teams can work against contracts
- Backend teams can evolve services safely

### 3. **Living Documentation**
- Pact files document API expectations
- Always up-to-date with actual usage

### 4. **Faster Feedback**
- Contract tests run in milliseconds
- No need for full environment setup

### 5. **Version Compatibility**
- Verify multiple provider versions against consumer
- Ensure backward compatibility

## Pact Workflow

```
┌──────────────┐
│   Consumer   │
│  Test Runs   │
└──────┬───────┘
       │
       │ Generates
       ▼
┌──────────────┐
│  Pact File   │
│   (JSON)     │
└──────┬───────┘
       │
       │ Verifies
       ▼
┌──────────────┐
│   Provider   │
│     Test     │
└──────────────┘
```

## Advanced: Pact Broker (Optional)

For production use, deploy a **Pact Broker** to:
- Store and version contracts
- Enable CI/CD integration
- Visualize contract relationships
- Enable can-i-deploy checks

```bash
# Run Pact Broker with Docker
docker run -d -p 9292:9292 \
  -e PACT_BROKER_DATABASE_URL=sqlite:///tmp/pact_broker.db \
  pactfoundation/pact-broker:latest

# Publish contracts
npx pact-broker publish \
  pacts \
  --consumer-app-version 1.0.0 \
  --broker-base-url http://localhost:9292
```

## Troubleshooting

### Pact Mock Server Won't Start
```bash
# Ensure port is free
lsof -i :3001
kill -9 <PID>

# Check logs
cat logs/pact.log
```

### Provider Verification Fails
```bash
# Ensure backends are running
docker-compose ps

# Check backend is accessible
curl http://localhost:3001/health
curl http://localhost:3002/health

# Review pact file expectations
cat pacts/aqs-service-bank-service.json
```

### State Handler Errors
```typescript
// Ensure state handlers return promises
stateHandlers: {
  'some state': () => Promise.resolve(), // Correct
  'some state': () => { }, // Wrong - must return promise
}
```

### Matcher Import Issues
```typescript
// Use correct import path
import { like, term } from '@pact-foundation/pact/src/dsl/matchers';
```

## Best Practices

1. **Keep Contracts Focused**
   - Test one interaction per test case
   - Avoid over-specifying (use matchers)

2. **Use Meaningful States**
   - State names should describe setup: "account exists", "service is down"
   - States should be independent

3. **Don't Test Implementation**
   - Focus on API contract, not internal logic
   - Use `like()` for non-critical values

4. **Version Contracts**
   - Tag contracts with consumer version
   - Track breaking changes

5. **Run Contracts in CI**
   - Consumer tests on every commit
   - Provider tests before deployment

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Contract Tests

on: [push, pull_request]

jobs:
  consumer-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run consumer tests
        run: npm run test:pact:consumer

      - name: Upload pact files
        uses: actions/upload-artifact@v3
        with:
          name: pacts
          path: pacts/

  provider-tests:
    needs: consumer-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Download pact files
        uses: actions/download-artifact@v3
        with:
          name: pacts
          path: pacts/

      - name: Start providers
        run: docker-compose up -d

      - name: Verify providers
        run: npm run test:pact:provider
```

## Resources

- [Pact Documentation](https://docs.pact.io/)
- [Pact JS](https://github.com/pact-foundation/pact-js)
- [Contract Testing Guide](https://martinfowler.com/articles/consumerDrivenContracts.html)

## Future Enhancements

- [x] Add contracts for loan, investment, legacy, crypto adapters
- [ ] Deploy Pact Broker for contract management
- [ ] Add can-i-deploy checks in CI/CD
- [ ] Version contracts with semantic versioning
- [ ] Add webhook verification for continuous contract testing
