import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { OperatorService } from '../../../services/user-management/services/operatorService';
import { logger } from '../../../shared/utils/logger';

const router = Router();
const operatorService = new OperatorService();

const createOperatorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['agent', 'supervisor', 'admin']),
  skills: z.array(z.string()),
  maxConcurrentChats: z.number().min(1).max(10),
});

const updateOperatorSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(['agent', 'supervisor', 'admin']).optional(),
  skills: z.array(z.string()).optional(),
  status: z.enum(['online', 'busy', 'offline']).optional(),
  maxConcurrentChats: z.number().min(1).max(10).optional(),
});

// Get all operators
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    let operators;

    if (status === 'online') {
      operators = await operatorService.getOnlineOperators();
    } else if (status === 'available') {
      operators = await operatorService.getAvailableOperators();
    } else {
      operators = await operatorService.getAllOperators();
    }

    res.json({
      success: true,
      data: { operators },
    });

  } catch (error) {
    logger.error('Error getting operators', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get specific operator
router.get('/:operatorId', async (req: Request, res: Response) => {
  try {
    const operatorId = req.params.operatorId;
    const stats = await operatorService.getOperatorStats(operatorId);

    if (!stats.operator) {
      return res.status(404).json({
        success: false,
        error: 'Operator not found',
      });
    }

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    logger.error('Error getting operator', { error, operatorId: req.params.operatorId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Create operator
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = createOperatorSchema.parse(req.body);
    
    const operator = await operatorService.createOperator({
      ...validatedData,
      status: 'offline',
    });

    res.status(201).json({
      success: true,
      data: { operator },
    });

  } catch (error) {
    logger.error('Error creating operator', { error, body: req.body });
    
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

// Update operator
router.patch('/:operatorId', async (req: Request, res: Response) => {
  try {
    const operatorId = req.params.operatorId;
    const validatedData = updateOperatorSchema.parse(req.body);

    const operator = await operatorService.updateOperator(operatorId, validatedData);

    if (!operator) {
      return res.status(404).json({
        success: false,
        error: 'Operator not found',
      });
    }

    res.json({
      success: true,
      data: { operator },
    });

  } catch (error) {
    logger.error('Error updating operator', { error, operatorId: req.params.operatorId });
    
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

// Update operator status
router.patch('/:operatorId/status', async (req: Request, res: Response) => {
  try {
    const operatorId = req.params.operatorId;
    const { status } = z.object({
      status: z.enum(['online', 'busy', 'offline']),
    }).parse(req.body);

    const operator = await operatorService.updateOperatorStatus(operatorId, status);

    if (!operator) {
      return res.status(404).json({
        success: false,
        error: 'Operator not found',
      });
    }

    logger.info('Updated operator status', { operatorId, status });

    res.json({
      success: true,
      data: { operator },
    });

  } catch (error) {
    logger.error('Error updating operator status', { error, operatorId: req.params.operatorId });
    
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

// Find best available operator
router.post('/assign', async (req: Request, res: Response) => {
  try {
    const { skills, priority } = z.object({
      skills: z.array(z.string()).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    }).parse(req.body);

    const operator = await operatorService.findBestOperator(skills, priority);

    if (!operator) {
      return res.json({
        success: true,
        data: { operator: null, message: 'No operators available' },
      });
    }

    res.json({
      success: true,
      data: { operator },
    });

  } catch (error) {
    logger.error('Error finding operator', { error });
    
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

// Increment operator chat count
router.post('/:operatorId/chat/increment', async (req: Request, res: Response) => {
  try {
    const operatorId = req.params.operatorId;
    const operator = await operatorService.incrementActiveChatCount(operatorId);

    if (!operator) {
      return res.status(404).json({
        success: false,
        error: 'Operator not found',
      });
    }

    res.json({
      success: true,
      data: { operator },
    });

  } catch (error) {
    logger.error('Error incrementing chat count', { error, operatorId: req.params.operatorId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Decrement operator chat count
router.post('/:operatorId/chat/decrement', async (req: Request, res: Response) => {
  try {
    const operatorId = req.params.operatorId;
    const operator = await operatorService.decrementActiveChatCount(operatorId);

    if (!operator) {
      return res.status(404).json({
        success: false,
        error: 'Operator not found',
      });
    }

    res.json({
      success: true,
      data: { operator },
    });

  } catch (error) {
    logger.error('Error decrementing chat count', { error, operatorId: req.params.operatorId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export { router as operatorRoutes };