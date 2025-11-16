import { Router, Request, Response } from 'express';
import { getCache } from '../cache';
import { getRegistry } from '../adapters/adapter';
import { authMiddleware, requireScope } from '../middleware/auth';
import { logger } from '../telemetry/logger';

const router = Router();

// POST /v1/admin/cache/invalidate/:accountId
router.post(
  '/cache/invalidate/:accountId',
  authMiddleware,
  requireScope('admin:cache'),
  async (req: Request, res: Response) => {
    const { accountId } = req.params;

    try {
      const cache = getCache();
      await cache.invalidate(accountId);
      res.status(200).json({ message: 'Cache invalidated', accountId });
    } catch (err: any) {
      logger.error('Cache invalidation failed', {
        accountId,
        error: err.message,
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /v1/admin/cache/invalidate-all
router.post(
  '/cache/invalidate-all',
  authMiddleware,
  requireScope('admin:cache'),
  async (_req: Request, res: Response) => {
    try {
      const cache = getCache();
      await cache.invalidateAll();
      res.status(200).json({ message: 'All cache invalidated' });
    } catch (err: any) {
      logger.error('Cache invalidate all failed', { error: err.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /v1/admin/backends/:backendName/simulate
router.post(
  '/backends/:backendName/simulate',
  authMiddleware,
  requireScope('admin:simulate'),
  async (req: Request, res: Response) => {
    const { backendName } = req.params;
    const { mode, latencyMs } = req.body;

    // This forwards to the mock backend's simulate endpoint
    const backendUrlMap: Record<string, string> = {
      'bank': process.env.BANK_SERVICE_URL || 'http://localhost:3001',
      'credit': process.env.CREDIT_SERVICE_URL || 'http://localhost:3002',
      'loan': process.env.LOAN_SERVICE_URL || 'http://localhost:3003',
      'investment': process.env.INVESTMENT_SERVICE_URL || 'http://localhost:3004',
      'legacy': process.env.LEGACY_SERVICE_URL || 'http://localhost:3005',
    };

    const backendUrl = backendUrlMap[backendName];
    if (!backendUrl) {
      res.status(404).json({ error: 'Backend not found' });
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, latencyMs }),
      });

      if (response.ok) {
        const data = await response.json();
        res.status(200).json(data);
      } else {
        res.status(response.status).json({ error: 'Backend simulation failed' });
      }
    } catch (err: any) {
      logger.error('Backend simulation failed', {
        backendName,
        error: err.message,
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /v1/admin/health
router.get('/health', async (_req: Request, res: Response) => {
  const cache = getCache();
  const registry = getRegistry();
  const adapters = registry.getAllAdapters();

  const cacheHealth = await cache.ping();
  const adapterHealth = await Promise.all(
    adapters.map(async (adapter) => {
      const health = adapter.health ? await adapter.health() : { healthy: true };
      return {
        adapter: adapter.backendName,
        healthy: health.healthy,
      };
    })
  );

  const allHealthy = cacheHealth && adapterHealth.every((a) => a.healthy);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    cache: cacheHealth ? 'up' : 'down',
    adapters: adapterHealth,
  });
});

export default router;
