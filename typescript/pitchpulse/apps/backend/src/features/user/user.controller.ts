import type { Response, NextFunction } from 'express';
import { userService } from './user.service.js';
import type { AuthRequest } from '../../shared/middleware/auth.js';
import { z } from 'zod';
import { AppError } from '../../shared/middleware/errorHandler.js';

const onboardingSchema = z.object({
  teams: z.array(z.string()).min(1),
  leagues: z.array(z.string()).min(1),
});

export const userController = {
  async completeOnboarding(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const validated = onboardingSchema.parse(req.body);
      const result = await userService.completeOnboarding(req.user.id, validated);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, 'Validation error'));
      } else {
        next(error);
      }
    }
  },

  async getUserPreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const preferences = await userService.getUserPreferences(req.user.id);
      res.json(preferences);
    } catch (error) {
      next(error);
    }
  },
};
