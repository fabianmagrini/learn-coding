import type { Response, NextFunction } from 'express';
import { feedService } from './feed.service.js';
import type { AuthRequest } from '../../shared/middleware/auth.js';
import { AppError } from '../../shared/middleware/errorHandler.js';

export const feedController = {
  async getPersonalizedFeed(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const articles = await feedService.getPersonalizedFeed(req.user.id);
      res.json(articles);
    } catch (error) {
      next(error);
    }
  },

  async getArticlesByTeam(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { team } = req.params;
      const articles = await feedService.getArticlesByTeam(team);
      res.json(articles);
    } catch (error) {
      next(error);
    }
  },

  async getLatestArticles(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const articles = await feedService.getLatestArticles(limit);
      res.json(articles);
    } catch (error) {
      next(error);
    }
  },
};
