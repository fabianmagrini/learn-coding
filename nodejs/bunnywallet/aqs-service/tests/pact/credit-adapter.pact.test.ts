/**
 * Pact Consumer Contract Test: Credit Adapter
 *
 * This test defines the contract between AQS (consumer) and credit-service (provider).
 */

import { Pact } from '@pact-foundation/pact';
import { like, term } from '@pact-foundation/pact/src/dsl/matchers';
import path from 'path';
import { CreditAdapter } from '../../src/adapters/creditAdapter';

describe('Pact Contract: CreditAdapter → credit-service', () => {
  const provider = new Pact({
    consumer: 'aqs-service',
    provider: 'credit-service',
    port: 3002,
    log: path.resolve(process.cwd(), 'logs', 'pact.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'warn',
  });

  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  afterEach(() => provider.verify());

  describe('GET /cards/:cardId', () => {
    it('should retrieve credit card account successfully', async () => {
      await provider.addInteraction({
        state: 'credit card credit-001 exists',
        uponReceiving: 'a request for credit card credit-001',
        withRequest: {
          method: 'GET',
          path: '/cards/credit-001',
          headers: {
            'X-API-Key': 'credit-demo-key-456',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            cardId: 'credit-001',
            cardNumber: term({
              generate: '**** **** **** 1234',
              matcher: '\\*{4} \\*{4} \\*{4} \\d{4}',
            }),
            cardholderName: like('Jane Smith'),
            cardType: term({
              generate: 'visa',
              matcher: 'visa|mastercard|amex',
            }),
            balance: {
              currency: 'USD',
              currentBalance: like(2345.67),
              availableCredit: like(7654.33),
              creditLimit: like(10000.00),
            },
            status: term({
              generate: 'active',
              matcher: 'active|suspended|closed',
            }),
            dueDate: term({
              generate: '2024-02-01',
              matcher: '\\d{4}-\\d{2}-\\d{2}',
            }),
            minimumPayment: like(50.00),
            lastUpdated: term({
              generate: '2024-01-15T10:30:00Z',
              matcher: '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z',
            }),
          },
        },
      });

      const adapter = new CreditAdapter('http://localhost:3002', 'credit-demo-key-456');
      const result = await adapter.getSummary('credit-001');

      expect(result.success).toBe(true);
      expect(result.accountId).toBe('credit-001');
      expect(result.raw).toMatchObject({
        accountId: 'credit-001',
        accountType: 'creditcard',
        balances: expect.arrayContaining([
          expect.objectContaining({
            currency: 'USD',
          }),
        ]),
      });
    });

    it('should handle card not found (404)', async () => {
      await provider.addInteraction({
        state: 'credit card credit-999 does not exist',
        uponReceiving: 'a request for non-existent card credit-999',
        withRequest: {
          method: 'GET',
          path: '/cards/credit-999',
          headers: {
            'X-API-Key': 'credit-demo-key-456',
          },
        },
        willRespondWith: {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: 'card_not_found',
            message: like('Credit card not found'),
          },
        },
      });

      const adapter = new CreditAdapter('http://localhost:3002', 'credit-demo-key-456');
      const result = await adapter.getSummary('credit-999');

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
            service: 'credit-service',
          },
        },
      });

      const adapter = new CreditAdapter('http://localhost:3002', 'credit-demo-key-456');
      const result = await adapter.health();

      expect(result.healthy).toBe(true);
    });
  });
});
