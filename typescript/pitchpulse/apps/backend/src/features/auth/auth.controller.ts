import type { Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import type { AuthRequest } from '../../shared/middleware/auth.js';
import { z } from 'zod';
import { AppError } from '../../shared/middleware/errorHandler.js';

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authController = {
  async register(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await authService.register(validated);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, 'Validation error'));
      } else {
        next(error);
      }
    }
  },

  async login(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await authService.login(validated);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, 'Validation error'));
      } else {
        next(error);
      }
    }
  },

  async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const user = await authService.getMe(req.user.id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  },
};
