/**
 * Integration tests for Mockingbird server
 */

import request from 'supertest';
import { MockingbirdServer } from '../index';
import * as fs from 'fs';
import * as path from 'path';

describe('Mockingbird Integration Tests', () => {
  let server: MockingbirdServer;
  const testDir = path.join(__dirname, 'test-mocks');

  beforeAll(() => {
    // Create test fixtures directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Create test mock configuration
    const mockConfig = {
      mocks: [
        {
          request: {
            method: 'GET',
            path: '/api/users/:id'
          },
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              id: '{{request.params.id}}',
              name: 'John Doe',
              email: 'john@example.com'
            }
          }
        },
        {
          request: {
            method: 'POST',
            path: '/api/users'
          },
          response: {
            statusCode: 201,
            body: {
              id: '123',
              message: 'User created'
            }
          }
        },
        {
          request: {
            method: 'GET',
            path: '/api/search',
            query: {
              q: 'test'
            }
          },
          response: {
            statusCode: 200,
            body: {
              query: '{{request.query.q}}',
              results: []
            }
          }
        }
      ]
    };

    fs.writeFileSync(
      path.join(testDir, 'mocks.json'),
      JSON.stringify(mockConfig, null, 2)
    );
  });

  afterAll(() => {
    // Clean up test fixtures
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    server = new MockingbirdServer();
    server.loadFromFile(path.join(testDir, 'mocks.json'));
  });

  describe('Mock Endpoint Matching', () => {
    it('should return mock response for matching GET request with path params', async () => {
      const response = await request(server.getApp())
        .get('/api/users/42')
        .expect(200);

      expect(response.body).toEqual({
        id: '42',
        name: 'John Doe',
        email: 'john@example.com'
      });
    });

    it('should return mock response for matching POST request', async () => {
      const response = await request(server.getApp())
        .post('/api/users')
        .send({ name: 'Jane Doe' })
        .expect(201);

      expect(response.body).toEqual({
        id: '123',
        message: 'User created'
      });
    });

    it('should return mock response when query parameters match', async () => {
      const response = await request(server.getApp())
        .get('/api/search?q=test')
        .expect(200);

      expect(response.body).toEqual({
        query: 'test',
        results: []
      });
    });

    it('should return 404 when no mock matches', async () => {
      const response = await request(server.getApp())
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('No matching mock found');
    });

    it('should not match when query parameters do not match', async () => {
      await request(server.getApp())
        .get('/api/search?q=other')
        .expect(404);
    });
  });

  describe('Admin API', () => {
    it('should list all loaded mocks', async () => {
      const response = await request(server.getApp())
        .get('/__admin/mocks')
        .expect(200);

      expect(response.body.count).toBe(3);
      expect(response.body.mocks).toHaveLength(3);
    });

    it('should add a new mock at runtime', async () => {
      const newMock = {
        request: {
          method: 'GET',
          path: '/api/test'
        },
        response: {
          statusCode: 200,
          body: { test: true }
        }
      };

      await request(server.getApp())
        .post('/__admin/mocks')
        .send(newMock)
        .expect(201);

      // Verify the mock was added
      const response = await request(server.getApp())
        .get('/__admin/mocks')
        .expect(200);

      expect(response.body.count).toBe(4);
    });

    it('should clear all mocks', async () => {
      await request(server.getApp())
        .delete('/__admin/mocks')
        .expect(200);

      const response = await request(server.getApp())
        .get('/__admin/mocks')
        .expect(200);

      expect(response.body.count).toBe(0);
    });

    it('should return health status', async () => {
      const response = await request(server.getApp())
        .get('/__admin/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('mocksLoaded');
    });
  });

  describe('Template Processing', () => {
    it('should replace path parameters in response body', async () => {
      const response = await request(server.getApp())
        .get('/api/users/999')
        .expect(200);

      expect(response.body.id).toBe('999');
    });

    it('should replace query parameters in response body', async () => {
      const response = await request(server.getApp())
        .get('/api/search?q=test')
        .expect(200);

      expect(response.body.query).toBe('test');
    });
  });
});
