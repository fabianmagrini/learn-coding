import { Router, Request, Response } from 'express';
import { getOrchestrator } from '../orchestrator';
import { logger } from '../telemetry/logger';
import { RequestContext } from '../types';
import { authMiddleware, requireScope } from '../middleware/auth';
import { addSpanAttributes, setSpanError, getTraceId } from '../telemetry/spans';

const router = Router();

// GET /v1/accounts/:accountId
router.get(
  '/:accountId',
  authMiddleware,
  requireScope('accounts:read'),
  async (req: Request, res: Response) => {
    const { accountId } = req.params;
    const forceRefresh = req.headers['cache-control'] === 'no-cache';

    const context: RequestContext = {
      requestId: req.requestId,
      userId: req.user?.sub,
      scopes: req.user?.scopes,
      forceRefresh,
    };

    try {
      // Add custom span attributes
      addSpanAttributes({
        'account.id': accountId,
        'request.id': req.requestId,
        'cache.force_refresh': forceRefresh,
      });

      const orchestrator = getOrchestrator();
      const result = await orchestrator.getSingleAccount(accountId, context);

      // Add result attributes to span
      if (result.data) {
        addSpanAttributes({
          'account.type': result.data.accountType,
          'account.backend': result.data.backendSource,
          'account.stale': result.data.stale || false,
        });
      }

      // Get trace ID for response
      const traceId = getTraceId();

      if (result.status === 'ok' && result.data) {
        res.status(200).json({ ...result.data, traceId });
      } else if (result.status === 'not_found') {
        res.status(404).json({
          error: result.error?.code,
          message: result.error?.message,
          traceId,
        });
      } else {
        // unavailable - return 503 with stale data if available
        if (result.data) {
          res.status(200).json({ ...result.data, traceId }); // Return stale but mark as such
        } else {
          res.status(503).json({
            error: result.error?.code,
            message: result.error?.message || 'Service unavailable',
            traceId,
          });
        }
      }
    } catch (err: any) {
      setSpanError(err);
      const traceId = getTraceId();
      logger.error('Account request failed', {
        accountId,
        requestId: req.requestId,
        error: err.message,
        traceId,
      });
      res.status(500).json({ error: 'Internal server error', traceId });
    }
  }
);

// GET /v1/accounts?ids=...
router.get(
  '/',
  authMiddleware,
  requireScope('accounts:read'),
  async (req: Request, res: Response) => {
    const idsParam = req.query.ids as string;
    const fieldsParam = req.query.fields as string;
    const forceRefresh = req.headers['cache-control'] === 'no-cache';

    if (!idsParam) {
      res.status(400).json({ error: 'Missing required query parameter: ids' });
      return;
    }

    const accountIds = idsParam.split(',').map((id) => id.trim());
    const fields = fieldsParam ? fieldsParam.split(',').map((f) => f.trim()) : undefined;

    const context: RequestContext = {
      requestId: req.requestId,
      userId: req.user?.sub,
      scopes: req.user?.scopes,
      forceRefresh,
    };

    try {
      // Add custom span attributes
      addSpanAttributes({
        'accounts.count': accountIds.length,
        'accounts.ids': accountIds.join(','),
        'request.id': req.requestId,
        'cache.force_refresh': forceRefresh,
      });

      const orchestrator = getOrchestrator();
      const response = await orchestrator.getMultipleAccounts(accountIds, context, {
        fields,
        forceRefresh,
      });

      // Add response attributes to span
      addSpanAttributes({
        'response.overall_status': response.overallStatus,
        'response.results_count': response.results.length,
      });

      // Get trace ID for response
      const traceId = getTraceId();
      const responseWithTrace = { ...response, traceId };

      // Return 206 Partial Content if some accounts failed
      if (response.overallStatus === 'partial') {
        res.status(206).json(responseWithTrace);
      } else if (response.overallStatus === 'error') {
        res.status(500).json(responseWithTrace);
      } else {
        res.status(200).json(responseWithTrace);
      }
    } catch (err: any) {
      setSpanError(err);
      const traceId = getTraceId();
      logger.error('Multi-account request failed', {
        requestId: req.requestId,
        error: err.message,
        traceId,
      });
      res.status(500).json({ error: 'Internal server error', traceId });
    }
  }
);

export default router;
