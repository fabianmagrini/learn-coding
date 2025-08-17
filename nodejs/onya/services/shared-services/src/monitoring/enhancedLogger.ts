import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';
import { metrics } from './metricsService';

// Define log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  trace: 5,
};

// Define colors for console output
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
  trace: 'gray',
};

// Add colors to winston
winston.addColors(LOG_COLORS);

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      message,
      service: 'shared-services',
      environment: process.env.NODE_ENV || 'development',
      ...meta,
    };
    
    return JSON.stringify(logEntry);
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss.SSS',
  }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';
    const correlationStr = correlationId ? `[${correlationId}] ` : '';
    return `${timestamp} ${level}: ${correlationStr}${message} ${metaStr}`;
  })
);

class EnhancedLogger {
  private winston: winston.Logger;
  private static instance: EnhancedLogger;

  private constructor() {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const isProduction = process.env.NODE_ENV === 'production';

    this.winston = winston.createLogger({
      level: logLevel,
      levels: LOG_LEVELS,
      format: structuredFormat,
      defaultMeta: {
        service: 'shared-services',
        version: '1.0.0',
        pid: process.pid,
      },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: isProduction ? structuredFormat : consoleFormat,
        }),
        
        // File transports for production
        ...(isProduction ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            tailable: true,
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 10,
            tailable: true,
          }),
        ] : []),
      ],
      
      // Handle uncaught exceptions and rejections
      exceptionHandlers: [
        new winston.transports.Console(),
        ...(isProduction ? [
          new winston.transports.File({ filename: 'logs/exceptions.log' })
        ] : []),
      ],
      rejectionHandlers: [
        new winston.transports.Console(),
        ...(isProduction ? [
          new winston.transports.File({ filename: 'logs/rejections.log' })
        ] : []),
      ],
    });

    // Create logs directory if it doesn't exist
    if (isProduction) {
      const fs = require('fs');
      if (!fs.existsSync('logs')) {
        fs.mkdirSync('logs');
      }
    }
  }

  public static getInstance(): EnhancedLogger {
    if (!EnhancedLogger.instance) {
      EnhancedLogger.instance = new EnhancedLogger();
    }
    return EnhancedLogger.instance;
  }

  // Correlation ID middleware
  public correlationMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Get correlation ID from header or generate new one
      const correlationId = req.get('x-correlation-id') || uuidv4();
      
      // Add to request object
      (req as any).correlationId = correlationId;
      
      // Add to response headers
      res.set('x-correlation-id', correlationId);
      
      next();
    };
  }

  // Request logging middleware
  public requestLoggingMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const correlationId = (req as any).correlationId;
      
      // Log request start
      this.info('HTTP Request Start', {
        correlationId,
        method: req.method,
        url: req.url,
        userAgent: req.get('user-agent'),
        ip: req.ip,
        headers: this.sanitizeHeaders(req.headers),
      });

      // Override res.end to log response
      const originalEnd = res.end;
      res.end = function(this: Response, chunk?: any, encoding?: any, cb?: any): Response {
        const duration = Date.now() - startTime;
        const responseSize = res.get('content-length') || 0;

        // Log response
        enhancedLogger.info('HTTP Request Complete', {
          correlationId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          responseSize: `${responseSize} bytes`,
        });

        // Record metrics
        metrics.recordError('http_error', 'api', res.statusCode >= 400 ? 'error' : 'info');

        // Call original end and return the response
        return originalEnd.call(this, chunk, encoding, cb) as Response;
      };

      next();
    };
  }

  // Sanitize headers to remove sensitive information
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-service-token'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  // Log methods with optional correlation ID context
  public error(message: string, meta: any = {}) {
    const correlationId = this.extractCorrelationId(meta);
    this.winston.error(message, { ...meta, correlationId });
    
    // Record error metric
    metrics.recordError(meta.errorType || 'generic', meta.service || 'shared-services', 'error');
  }

  public warn(message: string, meta: any = {}) {
    const correlationId = this.extractCorrelationId(meta);
    this.winston.warn(message, { ...meta, correlationId });
    
    // Record warning metric
    metrics.recordError(meta.errorType || 'generic', meta.service || 'shared-services', 'warn');
  }

  public info(message: string, meta: any = {}) {
    const correlationId = this.extractCorrelationId(meta);
    this.winston.info(message, { ...meta, correlationId });
  }

  public http(message: string, meta: any = {}) {
    const correlationId = this.extractCorrelationId(meta);
    this.winston.http(message, { ...meta, correlationId });
  }

  public debug(message: string, meta: any = {}) {
    const correlationId = this.extractCorrelationId(meta);
    this.winston.debug(message, { ...meta, correlationId });
  }

  public trace(message: string, meta: any = {}) {
    const correlationId = this.extractCorrelationId(meta);
    this.winston.log('trace', message, { ...meta, correlationId });
  }

  // Business logic specific logging methods
  public logChatSession(action: string, sessionId: string, meta: any = {}) {
    this.info(`Chat Session ${action}`, {
      ...meta,
      sessionId,
      action,
      component: 'chat-engine',
    });
  }

  public logLLMRequest(provider: string, duration: number, meta: any = {}) {
    this.info('LLM Request Processed', {
      ...meta,
      provider,
      duration: `${duration}ms`,
      component: 'llm-service',
    });
  }

  public logDatabaseQuery(operation: string, table: string, duration: number, meta: any = {}) {
    this.debug('Database Query', {
      ...meta,
      operation,
      table,
      duration: `${duration}ms`,
      component: 'database',
    });
  }

  public logAuthentication(action: string, userId?: string, meta: any = {}) {
    this.info(`Authentication ${action}`, {
      ...meta,
      userId,
      action,
      component: 'auth-service',
    });
  }

  public logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', meta: any = {}) {
    const logMethod = severity === 'critical' || severity === 'high' ? 'error' : 
                    severity === 'medium' ? 'warn' : 'info';
    
    this[logMethod](`Security Event: ${event}`, {
      ...meta,
      event,
      severity,
      component: 'security',
      securityEvent: true,
    });
  }

  // Extract correlation ID from various sources
  private extractCorrelationId(meta: any): string | undefined {
    return meta.correlationId || meta.req?.correlationId || undefined;
  }

  // Create child logger with context
  public createChildLogger(context: any) {
    return {
      error: (message: string, meta: any = {}) => this.error(message, { ...context, ...meta }),
      warn: (message: string, meta: any = {}) => this.warn(message, { ...context, ...meta }),
      info: (message: string, meta: any = {}) => this.info(message, { ...context, ...meta }),
      debug: (message: string, meta: any = {}) => this.debug(message, { ...context, ...meta }),
      trace: (message: string, meta: any = {}) => this.trace(message, { ...context, ...meta }),
    };
  }

  // Performance timing helper
  public createTimer(name: string, meta: any = {}) {
    const startTime = Date.now();
    
    return {
      end: () => {
        const duration = Date.now() - startTime;
        this.debug(`Timer: ${name}`, {
          ...meta,
          duration: `${duration}ms`,
          timerName: name,
        });
        return duration;
      },
    };
  }

  // Get underlying winston instance for advanced usage
  public getWinstonLogger(): winston.Logger {
    return this.winston;
  }
}

// Export singleton instance
export const enhancedLogger = EnhancedLogger.getInstance();
export default enhancedLogger;