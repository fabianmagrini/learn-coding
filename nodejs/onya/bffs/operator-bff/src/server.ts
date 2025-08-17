import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import responseTime from 'response-time';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { SocketService } from './services/socketService';
import { authenticateToken, AuthenticatedRequest } from './middleware/auth';
import chatRoutes from './routes/chat';
import operatorRoutes from './routes/operators';
import analyticsRoutes from './routes/analytics';
import { promisify } from 'util';
import { register, collectDefaultMetrics } from 'prom-client';

dotenv.config();

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3002;

collectDefaultMetrics();

const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900') * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

app.use(responseTime((req, res, time) => {
  logger.debug('Request completed', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: `${time}ms`
  });
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(rateLimiter);

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Failed to generate metrics', { error });
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

app.use('/api/chat', authenticateToken, chatRoutes);
app.use('/api/operators', authenticateToken, operatorRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);

app.get('/api/status', authenticateToken, (req: AuthenticatedRequest, res) => {
  res.json({
    success: true,
    data: {
      service: 'operator-bff',
      status: 'operational',
      timestamp: new Date().toISOString(),
      user: req.user
    }
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  if (res.headersSent) {
    return next(error);
  }

  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

const socketService = new SocketService(server);

const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});

server.listen(port, () => {
  logger.info(`Operator BFF server running on port ${port}`, {
    environment: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN,
    sharedServicesUrl: process.env.SHARED_SERVICES_URL
  });
});

export { app, server, socketService };