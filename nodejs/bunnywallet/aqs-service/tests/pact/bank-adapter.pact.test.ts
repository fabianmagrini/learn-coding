/**
 * Pact Consumer Contract Test: Bank Adapter
 *
 * This test defines the contract between AQS (consumer) and bank-service (provider).
 * It verifies that the BankAdapter correctly interacts with the bank backend.
 */

import { Pact } from '@pact-foundation/pact';
import { like, term } from '@pact-foundation/pact/src/dsl/matchers';
import path from 'path';
import { BankAdapter } from '../../src/adapters/bankAdapter';

describe('Pact Contract: BankAdapter → bank-service', () => {
  const provider = new Pact({
    consumer: 'aqs-service',
    provider: 'bank-service',
    port: 3001,
    log: path.resolve(process.cwd(), 'logs', 'pact.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'warn',
  });

  // Setup Pact mock server
  beforeAll(() => provider.setup());

  // Write pact file and tear down
  afterAll(() => provider.finalize());

  // Clear interactions after each test
  afterEach(() => provider.verify());

  describe('GET /accounts/:accountId', () => {
    it('should retrieve account successfully', async () => {
      // Define the expected interaction
      await provider.addInteraction({
        state: 'account bank-001 exists',
        uponReceiving: 'a request for account bank-001',
        withRequest: {
          method: 'GET',
          path: '/accounts/bank-001',
          headers: {
            'X-API-Key': 'bank-demo-key-123',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            accountId: 'bank-001',
            accountNumber: term({
              generate: '1234567890',
              matcher: '\\d{10}',
            }),
            accountName: like('John Doe Checking'),
            accountType: 'checking',
            balance: {
              currency: 'USD',
              available: like(15234.56),
              ledger: like(15234.56),
            },
            status: term({
              generate: 'active',
              matcher: 'active|suspended|closed',
            }),
            owner: {
              name: like('John Doe'),
              customerId: like('CUST-12345'),
            },
            lastUpdated: term({
              generate: '2024-01-15T10:30:00Z',
              matcher: '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z',
            }),
          },
        },
      });

      // Execute the actual adapter call
      const adapter = new BankAdapter('http://localhost:3001', 'bank-demo-key-123');
      const result = await adapter.getSummary('bank-001');

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.accountId).toBe('bank-001');
      expect(result.raw).toMatchObject({
        accountId: 'bank-001',
        accountType: 'bank',
        balances: expect.arrayContaining([
          expect.objectContaining({
            currency: 'USD',
            available: expect.any(Number),
          }),
        ]),
      });
    });

    it('should handle account not found (404)', async () => {
      await provider.addInteraction({
        state: 'account bank-999 does not exist',
        uponReceiving: 'a request for non-existent account bank-999',
        withRequest: {
          method: 'GET',
          path: '/accounts/bank-999',
          headers: {
            'X-API-Key': 'bank-demo-key-123',
          },
        },
        willRespondWith: {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: 'account_not_found',
            message: like('Account not found'),
          },
        },
      });

      const adapter = new BankAdapter('http://localhost:3001', 'bank-demo-key-123');
      const result = await adapter.getSummary('bank-999');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('backend_error');
    });

    it('should handle server errors (500)', async () => {
      await provider.addInteraction({
        state: 'bank service is experiencing errors',
        uponReceiving: 'a request when service is failing',
        withRequest: {
          method: 'GET',
          path: '/accounts/bank-002',
          headers: {
            'X-API-Key': 'bank-demo-key-123',
          },
        },
        willRespondWith: {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: like('internal_server_error'),
          },
        },
      });

      const adapter = new BankAdapter('http://localhost:3001', 'bank-demo-key-123');
      const result = await adapter.getSummary('bank-002');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('GET /health', () => {
    it('should verify health endpoint', async () => {
      await provider.addInteraction({
        state: 'service is healthy',
        uponReceiving: 'a health check request',
        withRequest: {
          method: 'GET',
          path: '/health',
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            status: 'healthy',
            service: 'bank-service',
            timestamp: like('2024-01-15T10:30:00Z'),
          },
        },
      });

      const adapter = new BankAdapter('http://localhost:3001', 'bank-demo-key-123');
      const result = await adapter.health();

      expect(result.healthy).toBe(true);
    });
  });
});
