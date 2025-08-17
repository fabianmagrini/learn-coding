import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { LlmRouter } from '../../../services/llm/services/llmRouter';
import { ConversationManager } from '../../../services/chat-engine/services/conversationManager';
import { logger } from '../../../shared/utils/logger';

const router = Router();
const llmRouter = new LlmRouter();
const conversationManager = new ConversationManager();

const processMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  sessionId: z.string(),
  customerId: z.string(),
  context: z.array(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

router.post('/process', async (req: Request, res: Response) => {
  try {
    const validatedData = processMessageSchema.parse(req.body);
    
    logger.info('Processing LLM message request', {
      sessionId: validatedData.sessionId,
      customerId: validatedData.customerId,
      messageLength: validatedData.message.length,
    });

    // Get session context
    const context = await conversationManager.getSessionContext(validatedData.sessionId);
    
    // Add recent messages to context if not provided
    const requestContext = validatedData.context || context.recentMessages;

    // Process message with LLM
    const llmResponse = await llmRouter.processMessage({
      message: validatedData.message,
      sessionId: validatedData.sessionId,
      customerId: validatedData.customerId,
      context: requestContext,
      metadata: {
        ...validatedData.metadata,
        customerTier: context.customer?.tier,
      },
    });

    // Save user message to conversation
    await conversationManager.addMessage(
      validatedData.sessionId,
      validatedData.message,
      'user',
      validatedData.customerId
    );

    // Save bot response to conversation
    await conversationManager.addMessage(
      validatedData.sessionId,
      llmResponse.content,
      'bot'
    );

    // Update session status if escalation required
    if (llmResponse.escalationRequired) {
      await conversationManager.updateSession(validatedData.sessionId, {
        status: 'escalated',
        metadata: {
          escalationReason: llmResponse.escalationReason,
          escalationTimestamp: new Date(),
        },
      });
    }

    res.json({
      success: true,
      data: {
        response: llmResponse,
        sessionStatus: llmResponse.escalationRequired ? 'escalated' : 'active',
      },
    });

  } catch (error) {
    logger.error('Error processing LLM message', { error, body: req.body });
    
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

router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = llmRouter.getStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Error getting LLM status', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export { router as llmRoutes };