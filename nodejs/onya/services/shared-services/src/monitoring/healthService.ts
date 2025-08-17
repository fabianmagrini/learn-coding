import { logger } from '../shared/utils/logger';
import { database } from '../database/prisma';
import { redis } from '../database/redis';
import { metrics } from './metricsService';
import { LlmRouter } from '../services/llm/services/llmRouter';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    [key: string]: ServiceHealth;
  };
  metrics?: {
    totalRequests: number;
    activeConnections: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  lastChecked: string;
  details?: any;
  error?: string;
}

class HealthService {
  private static instance: HealthService;
  private llmRouter: LlmRouter;
  private version: string = '1.0.0';

  private constructor() {
    this.llmRouter = new LlmRouter();
    logger.info('Health service initialized');
  }

  public static getInstance(): HealthService {
    if (!HealthService.instance) {
      HealthService.instance = new HealthService();
    }
    return HealthService.instance;
  }

  public async performHealthCheck(includeMetrics: boolean = false): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    logger.debug('Starting health check');

    // Perform all health checks in parallel
    const [
      databaseHealth,
      redisHealth,
      llmHealth,
      systemHealth,
    ] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkLLMService(),
      this.checkSystemHealth(),
    ]);

    const services: { [key: string]: ServiceHealth } = {
      database: this.getResultValue(databaseHealth),
      redis: this.getResultValue(redisHealth),
      llm: this.getResultValue(llmHealth),
      system: this.getResultValue(systemHealth),
    };

    // Determine overall status
    const overallStatus = this.determineOverallStatus(services);

    const healthResult: HealthCheckResult = {
      status: overallStatus,
      timestamp,
      uptime: process.uptime(),
      version: this.version,
      environment: process.env.NODE_ENV || 'development',
      services,
    };

    // Include metrics if requested
    if (includeMetrics) {
      healthResult.metrics = await this.collectMetrics();
    }

    const duration = Date.now() - startTime;
    logger.info('Health check completed', {
      status: overallStatus,
      duration: `${duration}ms`,
      services: Object.keys(services).reduce((acc, key) => {
        acc[key] = services[key].status;
        return acc;
      }, {} as { [key: string]: string }),
    });

    return healthResult;
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Test database connectivity
      const isHealthy = await database.healthCheck();
      const responseTime = Date.now() - startTime;

      if (isHealthy) {
        // Get additional database stats
        const stats = await this.getDatabaseStats();
        
        return {
          status: 'healthy',
          responseTime,
          lastChecked: new Date().toISOString(),
          details: stats,
        };
      } else {
        return {
          status: 'unhealthy',
          responseTime,
          lastChecked: new Date().toISOString(),
          error: 'Database ping failed',
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Database health check failed', { error });
      
      return {
        status: 'unhealthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Test Redis connectivity
      const isHealthy = await redis.healthCheck();
      const responseTime = Date.now() - startTime;

      if (isHealthy) {
        // Get Redis stats
        const stats = await redis.getStats();
        
        return {
          status: 'healthy',
          responseTime,
          lastChecked: new Date().toISOString(),
          details: stats,
        };
      } else {
        return {
          status: 'unhealthy',
          responseTime,
          lastChecked: new Date().toISOString(),
          error: 'Redis ping failed',
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Redis health check failed', { error });
      
      return {
        status: 'unhealthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown Redis error',
      };
    }
  }

  private async checkLLMService(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Test LLM service availability
      const llmStatus = this.llmRouter.getStatus();
      const responseTime = Date.now() - startTime;

      return {
        status: llmStatus.openaiAvailable || llmStatus.mockAvailable ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date().toISOString(),
        details: llmStatus,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('LLM service health check failed', { error });
      
      return {
        status: 'degraded', // LLM failure is degraded, not unhealthy
        responseTime,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown LLM error',
      };
    }
  }

  private async checkSystemHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const responseTime = Date.now() - startTime;

      // Check memory usage (consider unhealthy if over 90% of heap)
      const memoryThreshold = 0.9;
      const heapUsageRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (heapUsageRatio > memoryThreshold) {
        status = 'degraded';
      }

      return {
        status,
        responseTime,
        lastChecked: new Date().toISOString(),
        details: {
          memory: {
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            heapUsagePercent: `${Math.round(heapUsageRatio * 100)}%`,
            external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system,
          },
          uptime: process.uptime(),
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('System health check failed', { error });
      
      return {
        status: 'degraded',
        responseTime,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown system error',
      };
    }
  }

  private async getDatabaseStats(): Promise<any> {
    try {
      // Use the existing ChatRepository to get session stats
      const { ChatRepository } = await import('../database/repositories/chatRepository');
      const chatRepository = new ChatRepository();
      const sessionStats = await chatRepository.getSessionStats();
      
      return {
        sessions: sessionStats,
        connectionPool: {
          // These would be available if we had connection pool monitoring
          active: 'unknown',
          idle: 'unknown',
          total: 'unknown',
        },
      };
    } catch (error) {
      logger.warn('Could not get database stats', { error });
      return { error: 'Stats unavailable' };
    }
  }

  private determineOverallStatus(services: { [key: string]: ServiceHealth }): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(services).map(service => service.status);
    
    // If any critical service is unhealthy, overall is unhealthy
    if (statuses.includes('unhealthy')) {
      // Database and Redis are critical, LLM is not
      const criticalServices = ['database', 'redis'];
      const criticalUnhealthy = criticalServices.some(service => 
        services[service]?.status === 'unhealthy'
      );
      
      if (criticalUnhealthy) {
        return 'unhealthy';
      } else {
        return 'degraded';
      }
    }
    
    // If any service is degraded, overall is degraded
    if (statuses.includes('degraded')) {
      return 'degraded';
    }
    
    // All services healthy
    return 'healthy';
  }

  private getResultValue(result: PromiseSettledResult<ServiceHealth>): ServiceHealth {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'unhealthy',
        lastChecked: new Date().toISOString(),
        error: result.reason?.message || 'Health check failed',
      };
    }
  }

  private async collectMetrics() {
    try {
      const memoryUsage = process.memoryUsage();
      
      return {
        totalRequests: 0, // This would come from metrics service
        activeConnections: 0, // This would come from server monitoring
        memoryUsage,
      };
    } catch (error) {
      logger.error('Failed to collect metrics for health check', { error });
      return {
        totalRequests: 0,
        activeConnections: 0,
        memoryUsage: process.memoryUsage(),
      };
    }
  }

  // Quick health check for liveness probe
  public async isAlive(): Promise<boolean> {
    try {
      // Basic checks that the service is responding
      return true;
    } catch (error) {
      logger.error('Liveness check failed', { error });
      return false;
    }
  }

  // Readiness check for readiness probe
  public async isReady(): Promise<boolean> {
    try {
      // Check critical dependencies
      const databaseHealthy = await database.healthCheck();
      const redisHealthy = await redis.healthCheck();
      
      return databaseHealthy && redisHealthy;
    } catch (error) {
      logger.error('Readiness check failed', { error });
      return false;
    }
  }
}

// Export singleton instance
export const healthService = HealthService.getInstance();
export default healthService;