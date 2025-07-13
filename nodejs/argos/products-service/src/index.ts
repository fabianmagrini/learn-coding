import './tracing';
import express from 'express';
import { logger } from './logger';
import client from 'prom-client';
import { initializeTracing, shutdownTracing } from './tracing';

const app = express();
const PORT = process.env.PORT || 3001;

initializeTracing();

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const products = [
  { id: 1, name: 'Quantum Laptop' },
  { id: 2, name: 'Neutrino Keyboard' }
];

app.use(express.json());

app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode.toString()
    });
    
    logger.info({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent')
    }, 'HTTP request completed');
  });
  
  next();
});

app.get('/products/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  
  logger.info({ productId }, 'Fetching product');
  
  const product = products.find(p => p.id === productId);
  
  if (!product) {
    logger.warn({ productId }, 'Product not found');
    return res.status(404).json({ error: 'Product not found' });
  }
  
  logger.info({ product }, 'Product found');
  res.json(product);
});

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Products service started');
});

function gracefulShutdown() {
  logger.info('Shutting down gracefully...');
  server.close(async () => {
    try {
      await shutdownTracing();
      logger.info('Server closed');
      process.exit(0);
    } catch (error) {
      logger.error(error, 'Error during shutdown');
      process.exit(1);
    }
  });
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export { app, server };