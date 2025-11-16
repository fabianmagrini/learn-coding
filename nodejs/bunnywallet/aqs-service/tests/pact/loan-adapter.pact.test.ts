/**
 * Pact Consumer Contract Test: Loan Adapter
 *
 * This test defines the contract between AQS (consumer) and loan-service (provider).
 */

import { Pact } from '@pact-foundation/pact';
import { like, term } from '@pact-foundation/pact/src/dsl/matchers';
import path from 'path';
import { LoanAdapter } from '../../src/adapters/loanAdapter';

describe('Pact Contract: LoanAdapter → loan-service', () => {
  const provider = new Pact({
    consumer: 'aqs-service',
    provider: 'loan-service',
    port: 3003,
    log: path.resolve(process.cwd(), 'logs', 'pact.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'warn',
  });

  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  afterEach(() => provider.verify());

  describe('GET /loans/:loanId', () => {
    it('should retrieve loan account successfully', async () => {
      await provider.addInteraction({
        state: 'loan loan-001 exists',
        uponReceiving: 'a request for loan loan-001',
        withRequest: {
          method: 'GET',
          path: '/loans/loan-001',
          headers: {
            'X-API-Key': 'loan-demo-key-789',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            loanId: 'loan-001',
            loanNumber: term({
              generate: 'LOAN-1234567890',
              matcher: 'LOAN-\\d{10}',
            }),
            loanType: term({
              generate: 'mortgage',
              matcher: 'mortgage|auto|personal|student',
            }),
            borrower: {
              name: like('Alice Johnson'),
              customerId: like('CUST-56789'),
            },
            principal: like(250000.00),
            balance: {
              currency: 'USD',
              remainingBalance: like(238456.78),
              monthlyPayment: like(1850.00),
            },
            interestRate: like(3.75),
            status: term({
              generate: 'active',
              matcher: 'active|suspended|closed|default',
            }),
            nextPaymentDate: term({
              generate: '2024-02-01',
              matcher: '\\d{4}-\\d{2}-\\d{2}',
            }),
            lastUpdated: term({
              generate: '2024-01-15T10:30:00Z',
              matcher: '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z',
            }),
          },
        },
      });

      const adapter = new LoanAdapter('http://localhost:3003', 'loan-demo-key-789');
      const result = await adapter.getSummary('loan-001');

      expect(result.success).toBe(true);
      expect(result.accountId).toBe('loan-001');
      expect(result.raw).toMatchObject({
        accountId: 'loan-001',
        accountType: 'loan',
        balances: expect.arrayContaining([
          expect.objectContaining({
            currency: 'USD',
            available: expect.any(Number),
          }),
        ]),
      });
    });

    it('should handle loan not found (404)', async () => {
      await provider.addInteraction({
        state: 'loan loan-999 does not exist',
        uponReceiving: 'a request for non-existent loan loan-999',
        withRequest: {
          method: 'GET',
          path: '/loans/loan-999',
          headers: {
            'X-API-Key': 'loan-demo-key-789',
          },
        },
        willRespondWith: {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: 'loan_not_found',
            message: like('Loan not found'),
          },
        },
      });

      const adapter = new LoanAdapter('http://localhost:3003', 'loan-demo-key-789');
      const result = await adapter.getSummary('loan-999');

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
            service: 'loan-service',
          },
        },
      });

      const adapter = new LoanAdapter('http://localhost:3003', 'loan-demo-key-789');
      const result = await adapter.health();

      expect(result.healthy).toBe(true);
    });
  });
});
