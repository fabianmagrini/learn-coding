import { Router } from 'express';
import { AuthenticatedRequest, requireOperatorRole } from '../middleware/auth';
import { validateRequest, chatSessionParamsSchema, assignChatSchema, escalateChatSchema, resolveChatSchema, transferChatSchema, chatQueueQuerySchema } from '../middleware/validation';
import { createSharedServicesClient } from '../services/sharedServicesClient';
import { logger } from '../utils/logger';

const router = Router();
const sharedServicesClient = createSharedServicesClient();

router.get('/queue', 
  requireOperatorRole,
  validateRequest({ query: chatQueueQuerySchema }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { priority, skill, limit, offset } = req.query as any;
      
      const params: any = {
        status: 'PENDING',
        skip: offset,
        take: limit
      };

      if (priority) params.priority = priority;
      if (skill) params.skill = skill;

      const result = await sharedServicesClient.getChatSessions(params);
      
      res.json({
        success: true,
        data: {
          sessions: result.data?.sessions || [],
          total: result.data?.total || 0,
          hasMore: result.data?.hasMore || false
        }
      });
    } catch (error) {
      logger.error('Failed to get chat queue', { error, operatorId: req.user?.operatorId });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve chat queue' 
      });
    }
  }
);

router.get('/active', 
  requireOperatorRole,
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await sharedServicesClient.getChatSessions({
        operatorId: req.user!.operatorId,
        status: 'ACTIVE'
      });
      
      res.json({
        success: true,
        data: {
          sessions: result.data?.sessions || []
        }
      });
    } catch (error) {
      logger.error('Failed to get active chats', { error, operatorId: req.user?.operatorId });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve active chats' 
      });
    }
  }
);

router.get('/:sessionId', 
  requireOperatorRole,
  validateRequest({ params: chatSessionParamsSchema }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { sessionId } = req.params;
      
      const sessionResult = await sharedServicesClient.getChatSession(sessionId);
      const messagesResult = await sharedServicesClient.getChatMessages(sessionId);
      
      if (!sessionResult.success) {
        return res.status(404).json({ 
          success: false, 
          error: 'Chat session not found' 
        });
      }

      res.json({
        success: true,
        data: {
          session: sessionResult.data.session,
          messages: messagesResult.data?.messages || []
        }
      });
    } catch (error) {
      logger.error('Failed to get chat session', { error, sessionId: req.params.sessionId });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve chat session' 
      });
    }
  }
);

router.post('/assign', 
  requireOperatorRole,
  validateRequest({ body: assignChatSchema }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { sessionId, operatorId } = req.body;
      
      if (operatorId !== req.user!.operatorId && req.user!.role !== 'SUPERVISOR') {
        return res.status(403).json({ 
          success: false, 
          error: 'Can only assign chats to yourself unless you are a supervisor' 
        });
      }
      
      const result = await sharedServicesClient.assignOperatorToSession(sessionId, operatorId);
      
      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          error: 'Failed to assign chat session' 
        });
      }

      logger.info('Chat assigned to operator', { sessionId, operatorId, assignedBy: req.user!.id });

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      logger.error('Failed to assign chat', { error, body: req.body });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to assign chat session' 
      });
    }
  }
);

router.post('/:sessionId/escalate', 
  requireOperatorRole,
  validateRequest({ 
    params: chatSessionParamsSchema,
    body: escalateChatSchema 
  }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { sessionId } = req.params;
      const { operatorId, reason, priority } = req.body;
      
      const result = await sharedServicesClient.escalateSession(sessionId, {
        operatorId: operatorId || req.user!.operatorId!,
        reason,
        priority
      });
      
      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          error: 'Failed to escalate chat session' 
        });
      }

      logger.info('Chat escalated', { sessionId, reason, operatorId: req.user!.operatorId });

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      logger.error('Failed to escalate chat', { error, sessionId: req.params.sessionId });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to escalate chat session' 
      });
    }
  }
);

router.post('/:sessionId/resolve', 
  requireOperatorRole,
  validateRequest({ 
    params: chatSessionParamsSchema,
    body: resolveChatSchema 
  }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { sessionId } = req.params;
      const { resolution, customerSatisfaction, tags } = req.body;
      
      const result = await sharedServicesClient.resolveSession(sessionId, {
        operatorId: req.user!.operatorId!,
        resolution,
        customerSatisfaction,
        tags
      });
      
      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          error: 'Failed to resolve chat session' 
        });
      }

      logger.info('Chat resolved', { sessionId, operatorId: req.user!.operatorId });

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      logger.error('Failed to resolve chat', { error, sessionId: req.params.sessionId });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to resolve chat session' 
      });
    }
  }
);

router.post('/:sessionId/transfer', 
  requireOperatorRole,
  validateRequest({ 
    params: chatSessionParamsSchema,
    body: transferChatSchema 
  }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { sessionId } = req.params;
      const { toOperatorId, reason, notes, customerConsent } = req.body;
      
      const result = await sharedServicesClient.updateChatSession(sessionId, {
        operatorId: toOperatorId,
        status: 'TRANSFERRED',
        metadata: {
          transferredFrom: req.user!.operatorId,
          transferredTo: toOperatorId,
          transferReason: reason,
          transferNotes: notes,
          customerConsent,
          transferredAt: new Date().toISOString()
        }
      });
      
      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          error: 'Failed to transfer chat session' 
        });
      }

      logger.info('Chat transferred', { 
        sessionId, 
        fromOperatorId: req.user!.operatorId,
        toOperatorId,
        reason 
      });

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      logger.error('Failed to transfer chat', { error, sessionId: req.params.sessionId });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to transfer chat session' 
      });
    }
  }
);

router.post('/:sessionId/close', 
  requireOperatorRole,
  validateRequest({ params: chatSessionParamsSchema }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { sessionId } = req.params;
      
      const result = await sharedServicesClient.closeSession(sessionId, req.user!.operatorId!);
      
      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          error: 'Failed to close chat session' 
        });
      }

      logger.info('Chat closed', { sessionId, operatorId: req.user!.operatorId });

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      logger.error('Failed to close chat', { error, sessionId: req.params.sessionId });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to close chat session' 
      });
    }
  }
);

router.post('/:sessionId/messages', 
  requireOperatorRole,
  validateRequest({ params: chatSessionParamsSchema }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { sessionId } = req.params;
      const { content, type = 'operator' } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Message content is required' 
        });
      }
      
      const result = await sharedServicesClient.addChatMessage(sessionId, {
        content: content.trim(),
        type,
        userId: req.user!.id,
        metadata: {
          operatorId: req.user!.operatorId,
          timestamp: new Date().toISOString()
        }
      });
      
      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          error: 'Failed to send message' 
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      logger.error('Failed to send message', { error, sessionId: req.params.sessionId });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send message' 
      });
    }
  }
);

export default router;