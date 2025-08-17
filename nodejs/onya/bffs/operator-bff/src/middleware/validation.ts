import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { logger } from '../utils/logger';

export const validateRequest = (schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Request validation failed', { 
          errors: error.errors,
          path: req.path,
          method: req.method 
        });
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      } else {
        logger.error('Unexpected validation error', { error });
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
};

export const chatSessionParamsSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format')
});

export const operatorParamsSchema = z.object({
  operatorId: z.string().uuid('Invalid operator ID format')
});

export const assignChatSchema = z.object({
  sessionId: z.string().uuid(),
  operatorId: z.string().uuid()
});

export const escalateChatSchema = z.object({
  operatorId: z.string().uuid(),
  reason: z.string().min(1, 'Escalation reason is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional()
});

export const resolveChatSchema = z.object({
  resolution: z.string().min(1, 'Resolution description is required'),
  customerSatisfaction: z.number().min(1).max(5).optional(),
  tags: z.array(z.string()).optional()
});

export const transferChatSchema = z.object({
  toOperatorId: z.string().uuid(),
  reason: z.enum(['SKILL_MISMATCH', 'ESCALATION', 'WORKLOAD_BALANCE', 'SHIFT_CHANGE', 'TECHNICAL_ISSUE', 'CUSTOMER_REQUEST']),
  notes: z.string().min(1, 'Transfer notes are required'),
  customerConsent: z.boolean().default(false)
});

export const updateOperatorStatusSchema = z.object({
  status: z.enum(['ONLINE', 'BUSY', 'AWAY', 'OFFLINE'])
});

export const chatQueueQuerySchema = z.object({
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  skill: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0)
});

export const metricsQuerySchema = z.object({
  timeRange: z.enum(['1h', '6h', '24h', '7d', '30d']).default('24h'),
  operatorId: z.string().uuid().optional()
});