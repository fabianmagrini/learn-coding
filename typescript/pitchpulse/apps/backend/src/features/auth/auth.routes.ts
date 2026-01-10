import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from '../../shared/middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.get('/me', authenticate, authController.getMe);
