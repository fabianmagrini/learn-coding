import request from 'supertest';
import nock from 'nock';
import { app, server } from './index';

const PRODUCTS_SERVICE_URL = process.env.PRODUCTS_SERVICE_URL || 'http://products-service:3001';

describe('Orders Service', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  afterAll(async () => {
    nock.cleanAll();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('POST /orders', () => {
    it('should create order when product exists', async () => {
      nock(PRODUCTS_SERVICE_URL)
        .get('/products/1')
        .reply(200, { id: 1, name: 'Quantum Laptop' });

      const response = await request(app)
        .post('/orders')
        .send({ productId: 1, quantity: 2 })
        .expect(201);

      expect(response.body).toMatchObject({
        productId: 1,
        quantity: 2,
        status: 'confirmed'
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should return 400 when productId is missing', async () => {
      const response = await request(app)
        .post('/orders')
        .send({ quantity: 2 })
        .expect(400);

      expect(response.body).toEqual({
        error: 'productId and quantity are required'
      });
    });

    it('should return 400 when quantity is missing', async () => {
      const response = await request(app)
        .post('/orders')
        .send({ productId: 1 })
        .expect(400);

      expect(response.body).toEqual({
        error: 'productId and quantity are required'
      });
    });

    it('should return 400 when productId is not a number', async () => {
      const response = await request(app)
        .post('/orders')
        .send({ productId: 'invalid', quantity: 2 })
        .expect(400);

      expect(response.body).toEqual({
        error: 'productId and quantity must be numbers'
      });
    });

    it('should return 400 when quantity is not a number', async () => {
      const response = await request(app)
        .post('/orders')
        .send({ productId: 1, quantity: 'invalid' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'productId and quantity must be numbers'
      });
    });

    it('should return 400 when quantity is zero or negative', async () => {
      const response = await request(app)
        .post('/orders')
        .send({ productId: 1, quantity: 0 })
        .expect(400);

      expect(response.body).toEqual({
        error: 'quantity must be greater than 0'
      });
    });

    it('should return 400 when product does not exist', async () => {
      nock(PRODUCTS_SERVICE_URL)
        .get('/products/999')
        .reply(404);

      const response = await request(app)
        .post('/orders')
        .send({ productId: 999, quantity: 1 })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Product does not exist'
      });
    });

    it('should return 500 when products service is unreachable', async () => {
      nock(PRODUCTS_SERVICE_URL)
        .get('/products/1')
        .replyWithError('ECONNREFUSED');

      const response = await request(app)
        .post('/orders')
        .send({ productId: 1, quantity: 1 })
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error'
      });
    });

    it('should return 500 when products service times out', async () => {
      nock(PRODUCTS_SERVICE_URL)
        .get('/products/1')
        .delay(6000)
        .reply(200, { id: 1, name: 'Quantum Laptop' });

      const response = await request(app)
        .post('/orders')
        .send({ productId: 1, quantity: 1 })
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error'
      });
    });
  });

  describe('GET /healthz', () => {
    it('should return OK', async () => {
      const response = await request(app)
        .get('/healthz')
        .expect(200);

      expect(response.text).toBe('OK');
    });
  });

  describe('GET /metrics', () => {
    it('should return metrics in Prometheus format', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
    });
  });
});