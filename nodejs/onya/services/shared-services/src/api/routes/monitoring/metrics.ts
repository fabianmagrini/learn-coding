import { Router, Request, Response } from 'express';
import { metrics } from '../../../monitoring/metricsService';
import { healthService } from '../../../monitoring/healthService';
import { authenticateService } from '../../../middleware/authMiddleware';
import { logger } from '../../../shared/utils/logger';

const router = Router();

// Prometheus metrics endpoint
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const prometheusMetrics = await metrics.getMetrics();
    
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(prometheusMetrics);
  } catch (error) {
    logger.error('Failed to generate metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate metrics',
    });
  }
});

// Health check endpoint with detailed information
router.get('/health', async (req: Request, res: Response) => {
  try {
    const includeMetrics = req.query.metrics === 'true';
    const healthResult = await healthService.performHealthCheck(includeMetrics);
    
    // Set appropriate HTTP status based on health
    let statusCode = 200;
    if (healthResult.status === 'degraded') {
      statusCode = 200; // Still serving but with warnings
    } else if (healthResult.status === 'unhealthy') {
      statusCode = 503; // Service unavailable
    }
    
    res.status(statusCode).json({
      success: healthResult.status !== 'unhealthy',
      data: healthResult,
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// Kubernetes liveness probe endpoint
router.get('/health/live', async (req: Request, res: Response) => {
  try {
    const isAlive = await healthService.isAlive();
    
    if (isAlive) {
      res.status(200).json({
        success: true,
        status: 'alive',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        success: false,
        status: 'dead',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Liveness probe failed', { error });
    res.status(503).json({
      success: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Kubernetes readiness probe endpoint
router.get('/health/ready', async (req: Request, res: Response) => {
  try {
    const isReady = await healthService.isReady();
    
    if (isReady) {
      res.status(200).json({
        success: true,
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        success: false,
        status: 'not_ready',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Readiness probe failed', { error });
    res.status(503).json({
      success: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Service information endpoint (protected)
router.get('/info', authenticateService, async (req: Request, res: Response) => {
  try {
    const packageInfo = await import('../../../../package.json');
    
    res.json({
      success: true,
      data: {
        name: packageInfo.name,
        version: packageInfo.version,
        description: packageInfo.description,
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        pid: process.pid,
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to get service info', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get service information',
    });
  }
});

// Custom metrics endpoint (protected)
router.get('/metrics/custom', authenticateService, async (req: Request, res: Response) => {
  try {
    // Get business-specific metrics
    const { ChatRepository } = await import('../../../database/repositories/chatRepository');
    const chatRepository = new ChatRepository();
    
    const [sessionStats, redisStats] = await Promise.allSettled([
      chatRepository.getSessionStats(),
      import('../../../database/redis').then(({ redis }) => redis.getStats()),
    ]);
    
    const customMetrics = {
      chatSessions: sessionStats.status === 'fulfilled' ? sessionStats.value : null,
      redis: redisStats.status === 'fulfilled' ? redisStats.value : null,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
      timestamp: new Date().toISOString(),
    };
    
    res.json({
      success: true,
      data: customMetrics,
    });
  } catch (error) {
    logger.error('Failed to get custom metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get custom metrics',
    });
  }
});

// Debug endpoint for troubleshooting (protected)
router.get('/debug', authenticateService, async (req: Request, res: Response) => {
  try {
    const debugInfo = {
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        timezone: process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone,
        workingDirectory: process.cwd(),
      },
      timestamps: {
        server: new Date().toISOString(),
        utc: new Date().toUTCString(),
        local: new Date().toLocaleString(),
      },
    };
    
    res.json({
      success: true,
      data: debugInfo,
    });
  } catch (error) {
    logger.error('Failed to get debug info', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get debug information',
    });
  }
});

export { router as monitoringRoutes };