/**
 * Admin API Router
 * Provides endpoints to manage and inspect mocks at runtime
 */

import { Router, Request, Response } from 'express';
import { MockingbirdServer } from '../index';

/**
 * Creates the admin router
 * @param server Reference to the MockingbirdServer instance
 */
export function createAdminRouter(server: MockingbirdServer): Router {
  const router = Router();

  /**
   * GET /__admin/mocks
   * List all loaded mock definitions
   */
  router.get('/mocks', (req: Request, res: Response) => {
    const mocks = server.getMocks();
    res.json({
      count: mocks.length,
      mocks: mocks
    });
  });

  /**
   * POST /__admin/mocks
   * Add a new mock definition at runtime
   */
  router.post('/mocks', (req: Request, res: Response) => {
    try {
      const mock = req.body;

      // Basic validation
      if (!mock.request || !mock.response) {
        res.status(400).json({
          error: 'Invalid mock definition: "request" and "response" are required'
        });
        return;
      }

      server.addMock(mock);

      res.status(201).json({
        message: 'Mock added successfully',
        mock: mock
      });
    } catch (error) {
      res.status(400).json({
        error: (error as Error).message
      });
    }
  });

  /**
   * DELETE /__admin/mocks
   * Clear all loaded mock definitions
   */
  router.delete('/mocks', (req: Request, res: Response) => {
    const count = server.getMocks().length;
    server.clearMocks();

    res.json({
      message: `Cleared ${count} mock(s)`,
      count: count
    });
  });

  /**
   * GET /__admin/health
   * Health check endpoint
   */
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      version: '1.0.0',
      mocksLoaded: server.getMocks().length
    });
  });

  return router;
}
