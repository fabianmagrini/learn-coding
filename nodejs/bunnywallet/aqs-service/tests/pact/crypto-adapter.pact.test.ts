/**
 * Pact Consumer Contract Test: Crypto Adapter
 *
 * This test defines the contract between AQS (consumer) and crypto-service (provider).
 */

import { Pact } from '@pact-foundation/pact';
import { like, term, eachLike } from '@pact-foundation/pact/src/dsl/matchers';
import path from 'path';
import { CryptoAdapter } from '../../src/adapters/cryptoAdapter';

describe('Pact Contract: CryptoAdapter → crypto-service', () => {
  const provider = new Pact({
    consumer: 'aqs-service',
    provider: 'crypto-service',
    port: 3006,
    log: path.resolve(process.cwd(), 'logs', 'pact.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'warn',
  });

  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  afterEach(() => provider.verify());

  describe('GET /wallets/:walletId', () => {
    it('should retrieve crypto wallet successfully', async () => {
      await provider.addInteraction({
        state: 'wallet crypto-001 exists',
        uponReceiving: 'a request for wallet crypto-001',
        withRequest: {
          method: 'GET',
          path: '/wallets/crypto-001',
          headers: {
            'X-API-Key': 'demo-crypto-key',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            walletId: 'crypto-001',
            address: term({
              generate: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
              matcher: '^0x[a-fA-F0-9]{40}$',
            }),
            owner: {
              name: like('Sarah Lee'),
              customerId: like('CUST-11223'),
            },
            walletType: term({
              generate: 'hot',
              matcher: 'hot|cold|hardware',
            }),
            holdings: eachLike({
              currency: like('BTC'),
              symbol: like('BTC'),
              balance: like(0.5432),
              valueUsd: like(23456.78),
            }),
            totalValueUsd: like(45678.90),
            status: term({
              generate: 'active',
              matcher: 'active|suspended|locked',
            }),
            lastUpdated: term({
              generate: '2024-01-15T10:30:00Z',
              matcher: '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z',
            }),
          },
        },
      });

      const adapter = new CryptoAdapter('http://localhost:3006');
      const result = await adapter.getSummary('crypto-001');

      expect(result.success).toBe(true);
      expect(result.accountId).toBe('crypto-001');
      expect(result.raw).toMatchObject({
        accountId: 'crypto-001',
        accountType: 'crypto',
        balances: expect.arrayContaining([
          expect.objectContaining({
            currency: expect.any(String),
            available: expect.any(Number),
          }),
        ]),
      });
    });

    it('should handle wallet not found (404)', async () => {
      await provider.addInteraction({
        state: 'wallet crypto-999 does not exist',
        uponReceiving: 'a request for non-existent wallet crypto-999',
        withRequest: {
          method: 'GET',
          path: '/wallets/crypto-999',
          headers: {
            'X-API-Key': 'demo-crypto-key',
          },
        },
        willRespondWith: {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: 'wallet_not_found',
            message: like('Wallet not found'),
          },
        },
      });

      const adapter = new CryptoAdapter('http://localhost:3006');
      const result = await adapter.getSummary('crypto-999');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('wallet_not_found');
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
            service: 'crypto-service',
          },
        },
      });

      const adapter = new CryptoAdapter('http://localhost:3006');
      const result = await adapter.health();

      expect(result.healthy).toBe(true);
    });
  });
});
