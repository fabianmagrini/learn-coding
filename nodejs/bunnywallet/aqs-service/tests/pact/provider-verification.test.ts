/**
 * Pact Provider Verification
 *
 * This test verifies that the mock backend services (providers) fulfill
 * the contracts defined by the AQS adapters (consumers).
 *
 * Run this test with mock backends running:
 * docker-compose up -d
 */

import { Verifier } from '@pact-foundation/pact';
import path from 'path';

describe('Pact Provider Verification', () => {
  // Verify bank-service honors the contract
  describe('bank-service provider', () => {
    it('should validate against consumer contract', async () => {
      const opts = {
        provider: 'bank-service',
        providerBaseUrl: process.env.BANK_SERVICE_URL || 'http://localhost:3001',
        pactUrls: [
          path.resolve(process.cwd(), 'pacts', 'aqs-service-bank-service.json'),
        ],
        stateHandlers: {
          'account bank-001 exists': () => {
            // Setup: Ensure bank-001 exists in mock
            // For demo, mock backend already has this data
            return Promise.resolve({ description: 'Account bank-001 is available' });
          },
          'account bank-999 does not exist': () => {
            // Setup: Ensure bank-999 does NOT exist
            return Promise.resolve({ description: 'Account bank-999 not found' });
          },
          'bank service is experiencing errors': () => {
            // Setup: Configure mock to return errors
            // Would typically call admin endpoint to set error mode
            return Promise.resolve({ description: 'Service in error state' });
          },
          'service is healthy': () => {
            return Promise.resolve({ description: 'Service is running' });
          },
        },
        logLevel: 'info',
        timeout: 30000,
      };

      const verifier = new Verifier(opts);
      await verifier.verifyProvider();
    }, 60000); // Increased timeout for provider verification
  });

  // Verify credit-service honors the contract
  describe('credit-service provider', () => {
    it('should validate against consumer contract', async () => {
      const opts = {
        provider: 'credit-service',
        providerBaseUrl: process.env.CREDIT_SERVICE_URL || 'http://localhost:3002',
        pactUrls: [
          path.resolve(process.cwd(), 'pacts', 'aqs-service-credit-service.json'),
        ],
        stateHandlers: {
          'credit card credit-001 exists': () => {
            return Promise.resolve({ description: 'Credit card credit-001 is available' });
          },
          'credit card credit-999 does not exist': () => {
            return Promise.resolve({ description: 'Credit card credit-999 not found' });
          },
          'service is healthy': () => {
            return Promise.resolve({ description: 'Service is running' });
          },
        },
        logLevel: 'info',
        timeout: 30000,
      };

      const verifier = new Verifier(opts);
      await verifier.verifyProvider();
    }, 60000);
  });

  // Verify loan-service honors the contract
  describe('loan-service provider', () => {
    it('should validate against consumer contract', async () => {
      const opts = {
        provider: 'loan-service',
        providerBaseUrl: process.env.LOAN_SERVICE_URL || 'http://localhost:3003',
        pactUrls: [
          path.resolve(process.cwd(), 'pacts', 'aqs-service-loan-service.json'),
        ],
        stateHandlers: {
          'loan loan-001 exists': () => {
            return Promise.resolve({ description: 'Loan loan-001 is available' });
          },
          'loan loan-999 does not exist': () => {
            return Promise.resolve({ description: 'Loan loan-999 not found' });
          },
          'service is healthy': () => {
            return Promise.resolve({ description: 'Service is running' });
          },
        },
        logLevel: 'info',
        timeout: 30000,
      };

      const verifier = new Verifier(opts);
      await verifier.verifyProvider();
    }, 60000);
  });

  // Verify investment-service honors the contract
  describe('investment-service provider', () => {
    it('should validate against consumer contract', async () => {
      const opts = {
        provider: 'investment-service',
        providerBaseUrl: process.env.INVESTMENT_SERVICE_URL || 'http://localhost:3004',
        pactUrls: [
          path.resolve(process.cwd(), 'pacts', 'aqs-service-investment-service.json'),
        ],
        stateHandlers: {
          'portfolio invest-001 exists': () => {
            return Promise.resolve({ description: 'Portfolio invest-001 is available' });
          },
          'portfolio invest-999 does not exist': () => {
            return Promise.resolve({ description: 'Portfolio invest-999 not found' });
          },
          'service is healthy': () => {
            return Promise.resolve({ description: 'Service is running' });
          },
        },
        logLevel: 'info',
        timeout: 30000,
      };

      const verifier = new Verifier(opts);
      await verifier.verifyProvider();
    }, 60000);
  });

  // Verify legacy-service honors the contract
  describe('legacy-service provider', () => {
    it('should validate against consumer contract', async () => {
      const opts = {
        provider: 'legacy-service',
        providerBaseUrl: process.env.LEGACY_SERVICE_URL || 'http://localhost:3005',
        pactUrls: [
          path.resolve(process.cwd(), 'pacts', 'aqs-service-legacy-service.json'),
        ],
        stateHandlers: {
          'account legacy-001 exists': () => {
            return Promise.resolve({ description: 'Legacy account legacy-001 is available' });
          },
          'account legacy-999 does not exist': () => {
            return Promise.resolve({ description: 'Legacy account legacy-999 not found' });
          },
          'service is healthy': () => {
            return Promise.resolve({ description: 'Service is running' });
          },
        },
        logLevel: 'info',
        timeout: 30000,
      };

      const verifier = new Verifier(opts);
      await verifier.verifyProvider();
    }, 60000);
  });

  // Verify crypto-service honors the contract
  describe('crypto-service provider', () => {
    it('should validate against consumer contract', async () => {
      const opts = {
        provider: 'crypto-service',
        providerBaseUrl: process.env.CRYPTO_SERVICE_URL || 'http://localhost:3006',
        pactUrls: [
          path.resolve(process.cwd(), 'pacts', 'aqs-service-crypto-service.json'),
        ],
        stateHandlers: {
          'wallet crypto-001 exists': () => {
            return Promise.resolve({ description: 'Crypto wallet crypto-001 is available' });
          },
          'wallet crypto-999 does not exist': () => {
            return Promise.resolve({ description: 'Crypto wallet crypto-999 not found' });
          },
          'service is healthy': () => {
            return Promise.resolve({ description: 'Service is running' });
          },
        },
        logLevel: 'info',
        timeout: 30000,
      };

      const verifier = new Verifier(opts);
      await verifier.verifyProvider();
    }, 60000);
  });
});
