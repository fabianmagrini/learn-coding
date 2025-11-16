import { Router, Request, Response } from 'express';
import { register } from '../telemetry/metrics';

const router = Router();

// GET /metrics - Prometheus metrics endpoint
router.get('/', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
