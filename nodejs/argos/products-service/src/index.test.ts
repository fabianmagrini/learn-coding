import request from 'supertest';
import { app, server } from './index';

describe('Products Service', () => {
  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('GET /products/:id', () => {
    it('should return product when it exists', async () => {
      const response = await request(app)
        .get('/products/1')
        .expect(200);

      expect(response.body).toEqual({
        id: 1,
        name: 'Quantum Laptop'
      });
    });

    it('should return 404 when product does not exist', async () => {
      const response = await request(app)
        .get('/products/999')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Product not found'
      });
    });

    it('should handle invalid product ID', async () => {
      await request(app)
        .get('/products/invalid')
        .expect(404);
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