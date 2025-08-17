import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './shared/utils/config';
import { logger } from './shared/utils/logger';
import { llmRoutes } from './api/routes/llm/processMessage';
import { chatRoutes } from './api/routes/chat/conversations';
import { operatorRoutes } from './api/routes/users/operators';
import { authRoutes } from './api/routes/auth/authRoutes';
import { monitoringRoutes } from './api/routes/monitoring/metrics';
import { corsWithAuth } from './middleware/authMiddleware';
import { metrics } from './monitoring/metricsService';
import { enhancedLogger } from './monitoring/enhancedLogger';
import responseTime from 'response-time';

const app = express();

// Monitoring middleware (before other middleware)
app.use(responseTime());
app.use(enhancedLogger.correlationMiddleware());
app.use(metrics.httpMetricsMiddleware());

// Security middleware
app.use(helmet());

// Enhanced CORS with authentication awareness
app.use(corsWithAuth);

// Parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Enhanced request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(enhancedLogger.requestLoggingMiddleware());
}

// Monitoring routes (health, metrics, etc.)
app.use('/', monitoringRoutes);

// Authentication routes (no auth required for registration/login)
app.use('/api/auth', authRoutes);

// Protected API routes
app.use('/api/llm', llmRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users/operators', operatorRoutes);

// Global error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  enhancedLogger.error('Unhandled error', { 
    error: error.message, 
    stack: error.stack,
    path: req.path,
    method: req.method,
    correlationId: (req as any).correlationId,
    errorType: 'unhandled_error',
    service: 'shared-services',
  });

  // Record error metric
  metrics.recordError('unhandled_error', 'shared-services', 'error');

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    correlationId: (req as any).correlationId,
    ...(config.NODE_ENV === 'development' && { details: error.message }),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

export { app };