import { Router } from 'express';
import { feedController } from './feed.controller.js';
import { authenticate } from '../../shared/middleware/auth.js';

export const feedRouter = Router();

feedRouter.use(authenticate);

feedRouter.get('/personalized', feedController.getPersonalizedFeed);
feedRouter.get('/team/:team', feedController.getArticlesByTeam);
feedRouter.get('/latest', feedController.getLatestArticles);
