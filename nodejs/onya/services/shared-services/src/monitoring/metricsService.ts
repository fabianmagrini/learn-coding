import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../shared/utils/logger';

class MetricsService {
  private static instance: MetricsService;

  // HTTP Metrics
  public httpRequestsTotal: Counter<string>;
  public httpRequestDuration: Histogram<string>;
  public httpRequestSize: Histogram<string>;
  public httpResponseSize: Histogram<string>;

  // Application Metrics
  public chatSessionsTotal: Counter<string>;
  public chatSessionsActive: Gauge<string>;
  public messagesProcessed: Counter<string>;
  public llmRequestsTotal: Counter<string>;
  public llmRequestDuration: Histogram<string>;
  public escalationsTotal: Counter<string>;

  // Database Metrics
  public dbConnectionsActive: Gauge<string>;
  public dbQueriesTotal: Counter<string>;
  public dbQueryDuration: Histogram<string>;

  // Redis Metrics
  public redisConnectionsActive: Gauge<string>;
  public redisOperationsTotal: Counter<string>;
  public redisOperationDuration: Histogram<string>;

  // Authentication Metrics
  public authAttemptsTotal: Counter<string>;
  public authTokensIssued: Counter<string>;
  public authTokensRefreshed: Counter<string>;

  // Error Metrics
  public errorsTotal: Counter<string>;
  public rateLimitHits: Counter<string>;

  private constructor() {
    // Enable default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register });

    // HTTP Metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [register],
    });

    this.httpRequestSize = new Histogram({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [register],
    });

    this.httpResponseSize = new Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [register],
    });

    // Application Metrics
    this.chatSessionsTotal = new Counter({
      name: 'chat_sessions_total',
      help: 'Total number of chat sessions created',
      labelNames: ['customer_tier', 'source'],
      registers: [register],
    });

    this.chatSessionsActive = new Gauge({
      name: 'chat_sessions_active',
      help: 'Number of currently active chat sessions',
      labelNames: ['status'],
      registers: [register],
    });

    this.messagesProcessed = new Counter({
      name: 'messages_processed_total',
      help: 'Total number of messages processed',
      labelNames: ['type', 'source'],
      registers: [register],
    });

    this.llmRequestsTotal = new Counter({
      name: 'llm_requests_total',
      help: 'Total number of LLM requests',
      labelNames: ['provider', 'model', 'status'],
      registers: [register],
    });

    this.llmRequestDuration = new Histogram({
      name: 'llm_request_duration_seconds',
      help: 'Duration of LLM requests in seconds',
      labelNames: ['provider', 'model'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [register],
    });

    this.escalationsTotal = new Counter({
      name: 'escalations_total',
      help: 'Total number of chat escalations',
      labelNames: ['reason', 'customer_tier'],
      registers: [register],
    });

    // Database Metrics
    this.dbConnectionsActive = new Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      registers: [register],
    });

    this.dbQueriesTotal = new Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'table', 'status'],
      registers: [register],
    });

    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [register],
    });

    // Redis Metrics
    this.redisConnectionsActive = new Gauge({
      name: 'redis_connections_active',
      help: 'Number of active Redis connections',
      registers: [register],
    });

    this.redisOperationsTotal = new Counter({
      name: 'redis_operations_total',
      help: 'Total number of Redis operations',
      labelNames: ['operation', 'status'],
      registers: [register],
    });

    this.redisOperationDuration = new Histogram({
      name: 'redis_operation_duration_seconds',
      help: 'Duration of Redis operations in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
      registers: [register],
    });

    // Authentication Metrics
    this.authAttemptsTotal = new Counter({
      name: 'auth_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['method', 'status'],
      registers: [register],
    });

    this.authTokensIssued = new Counter({
      name: 'auth_tokens_issued_total',
      help: 'Total number of authentication tokens issued',
      labelNames: ['type'],
      registers: [register],
    });

    this.authTokensRefreshed = new Counter({
      name: 'auth_tokens_refreshed_total',
      help: 'Total number of authentication tokens refreshed',
      registers: [register],
    });

    // Error Metrics
    this.errorsTotal = new Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'service', 'severity'],
      registers: [register],
    });

    this.rateLimitHits = new Counter({
      name: 'rate_limit_hits_total',
      help: 'Total number of rate limit hits',
      labelNames: ['identifier_type'],
      registers: [register],
    });

    logger.info('Metrics service initialized');
  }

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  // HTTP Request Middleware
  public httpMetricsMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const route = this.getRoutePattern(req.route?.path || req.path);
      
      // Record request size
      const requestSize = req.get('content-length');
      if (requestSize) {
        this.httpRequestSize.observe(
          { method: req.method, route },
          parseInt(requestSize)
        );
      }

      // Override res.end to capture metrics
      const originalEnd = res.end;
      res.end = function(this: Response, chunk?: any, encoding?: any, cb?: any): Response {
        const duration = (Date.now() - startTime) / 1000;
        const statusCode = res.statusCode.toString();

        // Record HTTP metrics
        metrics.httpRequestsTotal.inc({
          method: req.method,
          route,
          status_code: statusCode,
        });

        metrics.httpRequestDuration.observe(
          { method: req.method, route, status_code: statusCode },
          duration
        );

        // Record response size
        const responseSize = res.get('content-length');
        if (responseSize) {
          metrics.httpResponseSize.observe(
            { method: req.method, route, status_code: statusCode },
            parseInt(responseSize)
          );
        }

        // Call original end and return the response
        return originalEnd.call(this, chunk, encoding, cb) as Response;
      };

      next();
    };
  }

  private getRoutePattern(path: string): string {
    // Convert dynamic routes to patterns
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[^\/]+$/g, '/:param');
  }

  // Business Logic Metrics Helpers
  public recordChatSessionCreated(customerTier: string, source: string = 'web') {
    this.chatSessionsTotal.inc({ customer_tier: customerTier, source });
  }

  public updateActiveSessions(status: string, count: number) {
    this.chatSessionsActive.set({ status }, count);
  }

  public recordMessageProcessed(type: string, source: string = 'customer') {
    this.messagesProcessed.inc({ type, source });
  }

  public recordLLMRequest(provider: string, model: string, duration: number, status: string = 'success') {
    this.llmRequestsTotal.inc({ provider, model, status });
    this.llmRequestDuration.observe({ provider, model }, duration);
  }

  public recordEscalation(reason: string, customerTier: string) {
    this.escalationsTotal.inc({ reason, customer_tier: customerTier });
  }

  public recordAuthAttempt(method: string, status: string) {
    this.authAttemptsTotal.inc({ method, status });
  }

  public recordTokenIssued(type: string) {
    this.authTokensIssued.inc({ type });
  }

  public recordTokenRefreshed() {
    this.authTokensRefreshed.inc();
  }

  public recordError(type: string, service: string, severity: string = 'error') {
    this.errorsTotal.inc({ type, service, severity });
  }

  public recordRateLimitHit(identifierType: string) {
    this.rateLimitHits.inc({ identifier_type: identifierType });
  }

  public recordDatabaseQuery(operation: string, table: string, duration: number, status: string = 'success') {
    this.dbQueriesTotal.inc({ operation, table, status });
    this.dbQueryDuration.observe({ operation, table }, duration);
  }

  public updateDatabaseConnections(count: number) {
    this.dbConnectionsActive.set(count);
  }

  public recordRedisOperation(operation: string, duration: number, status: string = 'success') {
    this.redisOperationsTotal.inc({ operation, status });
    this.redisOperationDuration.observe({ operation }, duration);
  }

  public updateRedisConnections(count: number) {
    this.redisConnectionsActive.set(count);
  }

  // Get metrics for Prometheus endpoint
  public async getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Clear all metrics (useful for testing)
  public clearMetrics() {
    register.clear();
  }

  // Get registry for custom metrics
  public getRegistry() {
    return register;
  }
}

// Export singleton instance
export const metrics = MetricsService.getInstance();
export default metrics;