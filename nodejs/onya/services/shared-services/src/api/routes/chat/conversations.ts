import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { EnhancedChatService } from '../../../services/chat-engine/enhancedChatService';
import { LlmRouter } from '../../../services/llm/services/llmRouter';
import { logger } from '../../../shared/utils/logger';
import { authenticate, optionalAuth, requireOwnership, rateLimit } from '../../../middleware/authMiddleware';

const router = Router();
const llmService = new LlmRouter();
const chatService = new EnhancedChatService(llmService);

// Apply rate limiting to all chat routes
router.use(rateLimit(300, 60)); // 60 requests per 5 minutes

const createSessionSchema = z.object({
  customerData: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    tier: z.enum(['BASIC', 'PREMIUM', 'ENTERPRISE']).optional(),
    metadata: z.record(z.any()).optional(),
  }).optional(),
});

const processMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  customerData: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    tier: z.enum(['BASIC', 'PREMIUM', 'ENTERPRISE']).default('BASIC'),
    metadata: z.record(z.any()).optional(),
  }).optional(),
});

const addMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.enum(['USER', 'ASSISTANT', 'SYSTEM']),
  metadata: z.record(z.any()).optional(),
});

const updateSessionSchema = z.object({
  status: z.enum(['ACTIVE', 'ESCALATED', 'RESOLVED', 'CLOSED']).optional(),
  operatorId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Create new chat session
router.post('/sessions', authenticate, async (req: Request, res: Response) => {
  try {
    const validatedData = createSessionSchema.parse(req.body);
    const customerId = req.user!.userId;
    
    // Create session with authenticated user
    const result = await chatService.createChatSession(customerId, validatedData.customerData || {});

    logger.info('Created enhanced chat session', {
      sessionId: result.session.id,
      customerId,
      tier: req.user!.tier,
    });

    res.status(201).json({
      success: true,
      data: result,
    });

  } catch (error) {
    logger.error('Error creating chat session', { error, body: req.body });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Get session details
router.get('/sessions/:sessionId', authenticate, async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId;
    const session = await chatService.getSessionDetails(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    // Check ownership unless user is admin
    if (req.user!.role !== 'ADMIN' && session.customerId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - not your session',
      });
    }

    res.json({
      success: true,
      data: { session },
    });

  } catch (error) {
    logger.error('Error getting session', { error, sessionId: req.params.sessionId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Update session (admin/operator only)
router.patch('/sessions/:sessionId', authenticate, async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId;
    const validatedData = updateSessionSchema.parse(req.body);

    // Only admins and operators can update sessions
    if (!['ADMIN', 'OPERATOR'].includes(req.user!.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    const updatedSession = await chatService.updateSessionStatus(sessionId, validatedData.status!);

    if (!updatedSession) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    res.json({
      success: true,
      data: { session: updatedSession },
    });

  } catch (error) {
    logger.error('Error updating session', { error, sessionId: req.params.sessionId });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get session messages
router.get('/sessions/:sessionId/messages', authenticate, async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    // Check session ownership first
    const session = await chatService.getSessionDetails(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    if (req.user!.role !== 'ADMIN' && session.customerId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const messages = await chatService.getChatHistory(sessionId, limit);

    res.json({
      success: true,
      data: { messages },
    });

  } catch (error) {
    logger.error('Error getting messages', { error, sessionId: req.params.sessionId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Process customer message (creates user message + bot response)
router.post('/sessions/:sessionId/process', authenticate, async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId;
    const validatedData = processMessageSchema.parse(req.body);
    const customerId = req.user!.userId;

    // Check session ownership
    const session = await chatService.getSessionDetails(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    if (session.customerId !== customerId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Process message with LLM
    const result = await chatService.processMessage(
      validatedData.message,
      sessionId,
      customerId,
      {
        name: req.user!.email, // Use email as fallback name
        email: req.user!.email,
        tier: req.user!.tier,
        ...validatedData.customerData,
      }
    );

    res.status(201).json({
      success: true,
      data: result,
    });

  } catch (error) {
    logger.error('Error processing message', { error, sessionId: req.params.sessionId });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Add message to session (operator/admin only)
router.post('/sessions/:sessionId/messages', authenticate, async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId;
    const validatedData = addMessageSchema.parse(req.body);

    // Only operators and admins can manually add messages
    if (!['ADMIN', 'OPERATOR'].includes(req.user!.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    const { ChatRepository } = await import('../../../database/repositories/chatRepository');
    const chatRepository = new ChatRepository();
    
    const message = await chatRepository.addMessage({
      sessionId,
      userId: req.user!.userId,
      content: validatedData.content,
      type: validatedData.type,
      metadata: validatedData.metadata,
    });

    res.status(201).json({
      success: true,
      data: { message },
    });

  } catch (error) {
    logger.error('Error adding message', { error, sessionId: req.params.sessionId });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get active sessions (admin/operator only)
router.get('/sessions', authenticate, async (req: Request, res: Response) => {
  try {
    // Only admins and operators can view all sessions
    if (!['ADMIN', 'OPERATOR'].includes(req.user!.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    const { ChatRepository } = await import('../../../database/repositories/chatRepository');
    const chatRepository = new ChatRepository();
    
    const sessions = await chatRepository.findActiveSessions();

    res.json({
      success: true,
      data: { sessions },
    });

  } catch (error) {
    logger.error('Error getting active sessions', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get user's own sessions
router.get('/my-sessions', authenticate, async (req: Request, res: Response) => {
  try {
    const customerId = req.user!.userId;
    
    const { ChatRepository } = await import('../../../database/repositories/chatRepository');
    const chatRepository = new ChatRepository();
    
    const sessions = await chatRepository.findSessionsByCustomer(customerId);

    res.json({
      success: true,
      data: { sessions },
    });

  } catch (error) {
    logger.error('Error getting user sessions', { error, customerId: req.user!.userId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export { router as chatRoutes };