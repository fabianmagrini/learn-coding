import { Router } from 'express';
import { userController } from './user.controller.js';
import { authenticate } from '../../shared/middleware/auth.js';

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.post('/onboarding', userController.completeOnboarding);
userRouter.get('/preferences', userController.getUserPreferences);
