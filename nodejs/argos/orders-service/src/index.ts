import './tracing';
import express from 'express';
import axios from 'axios';
import { logger } from './logger';
import client from 'prom-client';
import { initializeTracing, shutdownTracing } from './tracing';

const app = express();
const PORT = process.env.PORT || 3002;
const PRODUCTS_SERVICE_URL = process.env.PRODUCTS_SERVICE_URL || 'http://products-service:3001';

initializeTracing();

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const ordersCreated = new client.Counter({
  name: 'orders_created_total',
  help: 'Total number of orders created',
  registers: [register]
});

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

app.post('/orders', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    logger.info({ productId, quantity }, 'Creating order');
    
    if (!productId || !quantity) {
      logger.warn({ productId, quantity }, 'Missing required fields');
      return res.status(400).json({ error: 'productId and quantity are required' });
    }
    
    if (typeof productId !== 'number' || typeof quantity !== 'number') {
      logger.warn({ productId, quantity }, 'Invalid field types');
      return res.status(400).json({ error: 'productId and quantity must be numbers' });
    }
    
    if (quantity <= 0) {
      logger.warn({ quantity }, 'Invalid quantity');
      return res.status(400).json({ error: 'quantity must be greater than 0' });
    }
    
    try {
      logger.info({ productId, url: `${PRODUCTS_SERVICE_URL}/products/${productId}` }, 'Verifying product exists');
      
      const productResponse = await axios.get(`${PRODUCTS_SERVICE_URL}/products/${productId}`, {
        timeout: 5000
      });
      
      logger.info({ product: productResponse.data }, 'Product verified');
      
      const order = {
        id: Date.now(),
        productId,
        quantity,
        status: 'confirmed',
        createdAt: new Date().toISOString()
      };
      
      ordersCreated.inc();
      logger.info({ order }, 'Order created successfully');
      
      res.status(201).json(order);
      
    } catch (error: any) {
      if (error.response?.status === 404) {
        logger.warn({ productId }, 'Product does not exist');
        return res.status(400).json({ error: 'Product does not exist' });
      }
      
      logger.error({ error: error.message, productId }, 'Error verifying product');
      return res.status(500).json({ error: 'Internal server error' });
    }
    
  } catch (error: any) {
    logger.error({ error: error.message }, 'Unexpected error creating order');
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Orders service started');
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