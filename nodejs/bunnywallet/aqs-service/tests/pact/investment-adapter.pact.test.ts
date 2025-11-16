/**
 * Pact Consumer Contract Test: Investment Adapter
 *
 * This test defines the contract between AQS (consumer) and investment-service (provider).
 */

import { Pact } from '@pact-foundation/pact';
import { like, term, eachLike } from '@pact-foundation/pact/src/dsl/matchers';
import path from 'path';
import { InvestmentAdapter } from '../../src/adapters/investmentAdapter';

describe('Pact Contract: InvestmentAdapter → investment-service', () => {
  const provider = new Pact({
    consumer: 'aqs-service',
    provider: 'investment-service',
    port: 3004,
    log: path.resolve(process.cwd(), 'logs', 'pact.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'warn',
  });

  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  afterEach(() => provider.verify());

  describe('GET /portfolios/:portfolioId', () => {
    it('should retrieve investment portfolio successfully', async () => {
      await provider.addInteraction({
        state: 'portfolio invest-001 exists',
        uponReceiving: 'a request for portfolio invest-001',
        withRequest: {
          method: 'GET',
          path: '/portfolios/invest-001',
          headers: {
            'X-API-Key': 'investment-demo-key-abc',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            portfolioId: 'invest-001',
            accountNumber: term({
              generate: 'INV-9876543210',
              matcher: 'INV-\\d{10}',
            }),
            accountHolder: {
              name: like('Robert Williams'),
              customerId: like('CUST-98765'),
            },
            portfolioType: term({
              generate: 'retirement',
              matcher: 'retirement|brokerage|ira|401k',
            }),
            totalValue: like(125000.50),
            cashBalance: like(5000.00),
            holdings: eachLike({
              symbol: like('AAPL'),
              shares: like(100),
              currentPrice: like(175.50),
              totalValue: like(17550.00),
            }),
            status: term({
              generate: 'active',
              matcher: 'active|suspended|closed',
            }),
            lastUpdated: term({
              generate: '2024-01-15T10:30:00Z',
              matcher: '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z',
            }),
          },
        },
      });

      const adapter = new InvestmentAdapter('http://localhost:3004', 'investment-demo-key-abc');
      const result = await adapter.getSummary('invest-001');

      expect(result.success).toBe(true);
      expect(result.accountId).toBe('invest-001');
      expect(result.raw).toMatchObject({
        accountId: 'invest-001',
        accountType: 'investment',
        balances: expect.arrayContaining([
          expect.objectContaining({
            currency: 'USD',
            available: expect.any(Number),
          }),
        ]),
      });
    });

    it('should handle portfolio not found (404)', async () => {
      await provider.addInteraction({
        state: 'portfolio invest-999 does not exist',
        uponReceiving: 'a request for non-existent portfolio invest-999',
        withRequest: {
          method: 'GET',
          path: '/portfolios/invest-999',
          headers: {
            'X-API-Key': 'investment-demo-key-abc',
          },
        },
        willRespondWith: {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: 'portfolio_not_found',
            message: like('Portfolio not found'),
          },
        },
      });

      const adapter = new InvestmentAdapter('http://localhost:3004', 'investment-demo-key-abc');
      const result = await adapter.getSummary('invest-999');

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
            service: 'investment-service',
          },
        },
      });

      const adapter = new InvestmentAdapter('http://localhost:3004', 'investment-demo-key-abc');
      const result = await adapter.health();

      expect(result.healthy).toBe(true);
    });
  });
});
