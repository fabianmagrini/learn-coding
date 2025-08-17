import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { createSharedServicesClient } from '../services/sharedServicesClient';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    operatorId?: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    const decoded = jwt.verify(token, jwtSecret) as any;

    const sharedServicesClient = createSharedServicesClient();
    const userResponse = await sharedServicesClient.verifyToken(token);

    if (!userResponse.success) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      operatorId: decoded.operatorId,
    };

    next();
  } catch (error) {
    logger.error('Token verification failed', { error });
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireOperatorRole = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'OPERATOR' && req.user.role !== 'SUPERVISOR') {
    res.status(403).json({ error: 'Operator role required' });
    return;
  }

  next();
};

export const requireSupervisorRole = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'SUPERVISOR') {
    res.status(403).json({ error: 'Supervisor role required' });
    return;
  }

  next();
};