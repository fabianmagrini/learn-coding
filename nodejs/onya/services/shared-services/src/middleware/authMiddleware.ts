import { Request, Response, NextFunction } from 'express';
import { AuthService, AuthTokenPayload } from '../services/auth/authService';
import { UserRole } from '@prisma/client';
import { logger } from '../shared/utils/logger';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export class AuthMiddleware {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // Middleware to verify JWT token
  authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = this.authService.extractTokenFromHeader(req.headers.authorization);
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_TOKEN_MISSING',
        });
      }

      const payload = await this.authService.verifyToken(token);
      req.user = payload;

      logger.debug('User authenticated', {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        path: req.path,
      });

      next();
    } catch (error) {
      logger.warn('Authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        ip: req.ip,
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'AUTH_TOKEN_INVALID',
      });
    }
  };

  // Middleware to check if user has required role
  requireRole = (roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
      }

      if (!this.authService.hasRole(req.user, roles)) {
        logger.warn('Insufficient permissions', {
          userId: req.user.userId,
          userRole: req.user.role,
          requiredRoles: roles,
          path: req.path,
        });

        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'AUTH_INSUFFICIENT_PERMISSIONS',
        });
      }

      next();
    };
  };

  // Middleware to check specific permissions
  requirePermission = (resource: string, action: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
      }

      if (!this.authService.hasPermission(req.user, resource, action)) {
        logger.warn('Permission denied', {
          userId: req.user.userId,
          userRole: req.user.role,
          resource,
          action,
          path: req.path,
        });

        return res.status(403).json({
          success: false,
          error: 'Permission denied',
          code: 'AUTH_PERMISSION_DENIED',
        });
      }

      next();
    };
  };

  // Optional authentication - sets user if token is valid but doesn't require it
  optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = this.authService.extractTokenFromHeader(req.headers.authorization);
      
      if (token) {
        const payload = await this.authService.verifyToken(token);
        req.user = payload;
      }

      next();
    } catch (error) {
      // Continue without authentication for optional auth
      next();
    }
  };

  // Middleware to ensure user can only access their own resources
  requireOwnership = (userIdField: string = 'userId') => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
      }

      // Admins can access any resource
      if (req.user.role === 'ADMIN') {
        return next();
      }

      // Get the user ID from params or body
      const resourceUserId = req.params[userIdField] || req.body[userIdField];
      
      if (!resourceUserId) {
        return res.status(400).json({
          success: false,
          error: `${userIdField} is required`,
          code: 'VALIDATION_ERROR',
        });
      }

      if (req.user.userId !== resourceUserId) {
        logger.warn('Ownership validation failed', {
          userId: req.user.userId,
          resourceUserId,
          userIdField,
          path: req.path,
        });

        return res.status(403).json({
          success: false,
          error: 'Access denied - resource ownership required',
          code: 'AUTH_OWNERSHIP_REQUIRED',
        });
      }

      next();
    };
  };

  // Middleware for service-to-service authentication
  authenticateService = (req: Request, res: Response, next: NextFunction) => {
    const serviceToken = req.headers['x-service-token'] as string;
    const expectedToken = process.env.SERVICE_TOKEN || 'shared-service-secret-token';

    if (!serviceToken || serviceToken !== expectedToken) {
      logger.warn('Service authentication failed', {
        providedToken: serviceToken ? 'present' : 'missing',
        path: req.path,
        ip: req.ip,
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid service token',
        code: 'AUTH_SERVICE_TOKEN_INVALID',
      });
    }

    // Set a service user context
    req.user = {
      userId: 'system',
      email: 'system@onya.com',
      role: 'SYSTEM' as UserRole,
      tier: 'ENTERPRISE',
    };

    next();
  };

  // Rate limiting middleware
  rateLimit = (windowSeconds: number = 900, maxRequests: number = 100) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Use IP address as identifier, or user ID if authenticated
        const identifier = req.user?.userId || req.ip;
        const redis = require('../database/redis').redis;
        
        const result = await redis.checkRateLimit(identifier, windowSeconds, maxRequests);

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

        if (!result.allowed) {
          logger.warn('Rate limit exceeded', {
            identifier,
            windowSeconds,
            maxRequests,
            path: req.path,
          });

          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
          });
        }

        next();
      } catch (error) {
        logger.error('Rate limiting error', { error });
        // Continue on error to avoid blocking requests if Redis is down
        next();
      }
    };
  };

  // CORS middleware with authentication awareness
  corsWithAuth = (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      'http://localhost:5173', // Customer app
      'http://localhost:5174', // Operator app (when created)
      process.env.CUSTOMER_APP_URL,
      process.env.OPERATOR_APP_URL,
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Service-Token'
    );

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    next();
  };
}

// Export singleton instance
export const authMiddleware = new AuthMiddleware();

// Export commonly used middleware functions
export const {
  authenticate,
  requireRole,
  requirePermission,
  optionalAuth,
  requireOwnership,
  authenticateService,
  rateLimit,
  corsWithAuth,
} = authMiddleware;