import { Router } from 'express';
import { AuthenticatedRequest, requireOperatorRole, requireSupervisorRole } from '../middleware/auth';
import { validateRequest, metricsQuerySchema } from '../middleware/validation';
import { createSharedServicesClient } from '../services/sharedServicesClient';
import { logger } from '../utils/logger';

const router = Router();
const sharedServicesClient = createSharedServicesClient();

router.get('/dashboard', 
  requireOperatorRole,
  validateRequest({ query: metricsQuerySchema }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { timeRange } = req.query as any;
      
      const [chatMetrics, teamMetrics, operatorMetrics] = await Promise.all([
        sharedServicesClient.getChatMetrics(timeRange),
        sharedServicesClient.getTeamMetrics(timeRange),
        sharedServicesClient.getOperatorMetrics(req.user!.operatorId!, timeRange)
      ]);

      res.json({
        success: true,
        data: {
          chat: chatMetrics.data?.metrics || {},
          team: teamMetrics.data?.metrics || {},
          operator: operatorMetrics.data?.metrics || {},
          timeRange
        }
      });
    } catch (error) {
      logger.error('Failed to get dashboard analytics', { error, operatorId: req.user?.operatorId });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve dashboard analytics' 
      });
    }
  }
);

router.get('/team', 
  requireSupervisorRole,
  validateRequest({ query: metricsQuerySchema }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { timeRange } = req.query as any;
      
      const result = await sharedServicesClient.getTeamMetrics(timeRange);
      
      res.json({
        success: true,
        data: {
          metrics: result.data?.metrics || {},
          timeRange
        }
      });
    } catch (error) {
      logger.error('Failed to get team analytics', { error });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve team analytics' 
      });
    }
  }
);

router.get('/chat', 
  requireSupervisorRole,
  validateRequest({ query: metricsQuerySchema }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { timeRange } = req.query as any;
      
      const result = await sharedServicesClient.getChatMetrics(timeRange);
      
      res.json({
        success: true,
        data: {
          metrics: result.data?.metrics || {},
          timeRange
        }
      });
    } catch (error) {
      logger.error('Failed to get chat analytics', { error });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve chat analytics' 
      });
    }
  }
);

router.get('/performance', 
  requireSupervisorRole,
  async (req: AuthenticatedRequest, res) => {
    try {
      const timeRange = (req.query.timeRange as string) || '24h';
      
      const [operators, teamMetrics, chatMetrics] = await Promise.all([
        sharedServicesClient.getOperators(),
        sharedServicesClient.getTeamMetrics(timeRange),
        sharedServicesClient.getChatMetrics(timeRange)
      ]);

      const operatorMetricsPromises = (operators.data?.users || []).map((operator: any) =>
        sharedServicesClient.getOperatorMetrics(operator.id, timeRange)
          .then(result => ({
            operatorId: operator.id,
            metrics: result.data?.metrics || {}
          }))
          .catch(error => {
            logger.warn('Failed to get metrics for operator', { operatorId: operator.id, error });
            return { operatorId: operator.id, metrics: {} };
          })
      );

      const operatorMetrics = await Promise.all(operatorMetricsPromises);

      res.json({
        success: true,
        data: {
          team: teamMetrics.data?.metrics || {},
          chat: chatMetrics.data?.metrics || {},
          operators: operatorMetrics,
          timeRange
        }
      });
    } catch (error) {
      logger.error('Failed to get performance analytics', { error });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve performance analytics' 
      });
    }
  }
);

router.get('/realtime', 
  requireOperatorRole,
  async (req: AuthenticatedRequest, res) => {
    try {
      const [queuedChats, activeChats, onlineOperators] = await Promise.all([
        sharedServicesClient.getChatSessions({ status: 'PENDING' }),
        sharedServicesClient.getChatSessions({ status: 'ACTIVE' }),
        sharedServicesClient.getOperators()
      ]);

      const onlineOperatorCount = (onlineOperators.data?.users || [])
        .filter((op: any) => op.status === 'ONLINE' || op.status === 'BUSY').length;

      res.json({
        success: true,
        data: {
          queuedChats: queuedChats.data?.total || 0,
          activeChats: activeChats.data?.total || 0,
          onlineOperators: onlineOperatorCount,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to get realtime analytics', { error });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve realtime analytics' 
      });
    }
  }
);

router.get('/trends', 
  requireSupervisorRole,
  async (req: AuthenticatedRequest, res) => {
    try {
      const timeRanges = ['1h', '6h', '24h', '7d'];
      
      const trendsData = await Promise.all(
        timeRanges.map(async (range) => {
          try {
            const [chatMetrics, teamMetrics] = await Promise.all([
              sharedServicesClient.getChatMetrics(range),
              sharedServicesClient.getTeamMetrics(range)
            ]);
            
            return {
              timeRange: range,
              chat: chatMetrics.data?.metrics || {},
              team: teamMetrics.data?.metrics || {}
            };
          } catch (error) {
            logger.warn('Failed to get trend data for range', { range, error });
            return {
              timeRange: range,
              chat: {},
              team: {}
            };
          }
        })
      );

      res.json({
        success: true,
        data: {
          trends: trendsData,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to get trends analytics', { error });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve trends analytics' 
      });
    }
  }
);

export default router;