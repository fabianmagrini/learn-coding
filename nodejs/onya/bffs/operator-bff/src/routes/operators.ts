import { Router } from 'express';
import { AuthenticatedRequest, requireOperatorRole, requireSupervisorRole } from '../middleware/auth';
import { validateRequest, operatorParamsSchema, updateOperatorStatusSchema, metricsQuerySchema } from '../middleware/validation';
import { createSharedServicesClient } from '../services/sharedServicesClient';
import { logger } from '../utils/logger';

const router = Router();
const sharedServicesClient = createSharedServicesClient();

router.get('/me', 
  requireOperatorRole,
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await sharedServicesClient.getOperatorProfile(req.user!.operatorId!);
      
      if (!result.success) {
        return res.status(404).json({ 
          success: false, 
          error: 'Operator profile not found' 
        });
      }

      res.json({
        success: true,
        data: {
          profile: result.data.operator,
          user: req.user
        }
      });
    } catch (error) {
      logger.error('Failed to get operator profile', { error, operatorId: req.user?.operatorId });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve operator profile' 
      });
    }
  }
);

router.get('/', 
  requireSupervisorRole,
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await sharedServicesClient.getOperators();
      
      res.json({
        success: true,
        data: {
          operators: result.data?.users || []
        }
      });
    } catch (error) {
      logger.error('Failed to get operators list', { error });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve operators list' 
      });
    }
  }
);

router.get('/:operatorId', 
  requireSupervisorRole,
  validateRequest({ params: operatorParamsSchema }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { operatorId } = req.params;
      
      const result = await sharedServicesClient.getOperatorProfile(operatorId);
      
      if (!result.success) {
        return res.status(404).json({ 
          success: false, 
          error: 'Operator not found' 
        });
      }

      res.json({
        success: true,
        data: {
          operator: result.data.operator
        }
      });
    } catch (error) {
      logger.error('Failed to get operator', { error, operatorId: req.params.operatorId });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve operator' 
      });
    }
  }
);

router.put('/me/status', 
  requireOperatorRole,
  validateRequest({ body: updateOperatorStatusSchema }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { status } = req.body;
      
      const result = await sharedServicesClient.updateOperatorStatus(req.user!.operatorId!, status);
      
      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          error: 'Failed to update operator status' 
        });
      }

      logger.info('Operator status updated', { 
        operatorId: req.user!.operatorId,
        status,
        updatedBy: req.user!.id
      });

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      logger.error('Failed to update operator status', { error, operatorId: req.user?.operatorId });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update operator status' 
      });
    }
  }
);

router.put('/:operatorId/status', 
  requireSupervisorRole,
  validateRequest({ 
    params: operatorParamsSchema,
    body: updateOperatorStatusSchema 
  }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { operatorId } = req.params;
      const { status } = req.body;
      
      const result = await sharedServicesClient.updateOperatorStatus(operatorId, status);
      
      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          error: 'Failed to update operator status' 
        });
      }

      logger.info('Operator status updated by supervisor', { 
        operatorId,
        status,
        updatedBy: req.user!.id
      });

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      logger.error('Failed to update operator status', { error, operatorId: req.params.operatorId });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update operator status' 
      });
    }
  }
);

router.get('/me/sessions', 
  requireOperatorRole,
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await sharedServicesClient.getChatSessions({
        operatorId: req.user!.operatorId,
        take: 50
      });
      
      res.json({
        success: true,
        data: {
          sessions: result.data?.sessions || []
        }
      });
    } catch (error) {
      logger.error('Failed to get operator sessions', { error, operatorId: req.user?.operatorId });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve operator sessions' 
      });
    }
  }
);

router.get('/:operatorId/sessions', 
  requireSupervisorRole,
  validateRequest({ params: operatorParamsSchema }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { operatorId } = req.params;
      
      const result = await sharedServicesClient.getChatSessions({
        operatorId,
        take: 50
      });
      
      res.json({
        success: true,
        data: {
          sessions: result.data?.sessions || []
        }
      });
    } catch (error) {
      logger.error('Failed to get operator sessions', { error, operatorId: req.params.operatorId });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve operator sessions' 
      });
    }
  }
);

router.get('/me/metrics', 
  requireOperatorRole,
  validateRequest({ query: metricsQuerySchema }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { timeRange } = req.query as any;
      
      const result = await sharedServicesClient.getOperatorMetrics(req.user!.operatorId!, timeRange);
      
      res.json({
        success: true,
        data: {
          metrics: result.data?.metrics || {}
        }
      });
    } catch (error) {
      logger.error('Failed to get operator metrics', { error, operatorId: req.user?.operatorId });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve operator metrics' 
      });
    }
  }
);

router.get('/:operatorId/metrics', 
  requireSupervisorRole,
  validateRequest({ 
    params: operatorParamsSchema,
    query: metricsQuerySchema 
  }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { operatorId } = req.params;
      const { timeRange } = req.query as any;
      
      const result = await sharedServicesClient.getOperatorMetrics(operatorId, timeRange);
      
      res.json({
        success: true,
        data: {
          metrics: result.data?.metrics || {}
        }
      });
    } catch (error) {
      logger.error('Failed to get operator metrics', { error, operatorId: req.params.operatorId });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve operator metrics' 
      });
    }
  }
);

export default router;