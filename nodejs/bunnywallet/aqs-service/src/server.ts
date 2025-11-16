import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requestIdMiddleware } from './middleware/requestId';
import { metricsMiddleware } from './middleware/metrics';
import accountsRouter from './routes/accounts';
import adminRouter from './routes/admin';
import metricsRouter from './routes/metrics';
import { logger } from './telemetry/logger';
import { getRegistry } from './adapters/adapter';
import { BankAdapter } from './adapters/bankAdapter';
import { CreditAdapter } from './adapters/creditAdapter';
import { LoanAdapter } from './adapters/loanAdapter';
import { InvestmentAdapter } from './adapters/investmentAdapter';
import { LegacyAdapter } from './adapters/legacyAdapter';
import { CryptoAdapter } from './adapters/cryptoAdapter';

// Load environment variables
dotenv.config();

export function createApp(): Application {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use(metricsMiddleware);

  // Routes
  app.use('/v1/accounts', accountsRouter);
  app.use('/v1/admin', adminRouter);
  app.use('/metrics', metricsRouter);

  // Health check endpoint
  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      service: 'Account Query Service (AQS)',
      version: '1.0.0',
      endpoints: {
        accounts: '/v1/accounts/:accountId',
        multiAccounts: '/v1/accounts?ids=...',
        admin: '/v1/admin/*',
        metrics: '/metrics',
        health: '/healthz',
      },
    });
  });

  return app;
}

export function initializeAdapters(): void {
  const registry = getRegistry();

  // Register all adapters
  registry.register(new BankAdapter());
  registry.register(new CreditAdapter());
  registry.register(new LoanAdapter());
  registry.register(new InvestmentAdapter());
  registry.register(new LegacyAdapter());
  registry.register(new CryptoAdapter(process.env.CRYPTO_SERVICE_URL || 'http://localhost:3006'));

  logger.info('All adapters registered', {
    adapters: registry.getAllAdapters().map((a) => a.backendName),
  });
}

export function startServer(app: Application, port: number): void {
  app.listen(port, () => {
    logger.info(`AQS Service started`, {
      port,
      env: process.env.NODE_ENV || 'development',
    });
  });
}
