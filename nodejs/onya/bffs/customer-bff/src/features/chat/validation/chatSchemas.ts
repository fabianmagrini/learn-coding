import { z } from 'zod';

export const sendMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
  sessionId: z.string().min(1, 'Session ID required'),
});

export const createSessionSchema = z.object({
  customerData: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    tier: z.enum(['basic', 'premium', 'enterprise']).optional(),
    metadata: z.record(z.any()).optional(),
  }).optional(),
});

export const getChatHistorySchema = z.object({
  sessionId: z.string().min(1, 'Session ID required'),
  limit: z.number().min(1).max(100).optional(),
});

export const updateSessionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID required'),
  status: z.enum(['active', 'escalated', 'resolved', 'closed']).optional(),
});