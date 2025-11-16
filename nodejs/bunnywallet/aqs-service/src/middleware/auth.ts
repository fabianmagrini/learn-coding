import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../telemetry/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

export interface AuthPayload {
  sub: string;
  scopes: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    logger.warn('JWT verification failed', { error: err.message });
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.scopes.includes(scope)) {
      res.status(403).json({ error: `Missing required scope: ${scope}` });
      return;
    }
    next();
  };
}

// Helper function to generate demo tokens
export function generateDemoToken(sub: string, scopes: string[]): string {
  return jwt.sign({ sub, scopes }, JWT_SECRET, { expiresIn: '24h' });
}
