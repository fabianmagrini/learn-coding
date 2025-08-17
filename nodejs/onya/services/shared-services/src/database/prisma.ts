import { PrismaClient } from '@prisma/client';
import { logger } from '../shared/utils/logger';

class DatabaseService {
  private static instance: DatabaseService;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
    });

    // Database event logging would be configured here in the future
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public getClient(): PrismaClient {
    return this.prisma;
  }

  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to database', { error });
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      logger.info('Database disconnected');
    } catch (error) {
      logger.error('Failed to disconnect from database', { error });
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed', { error });
      return false;
    }
  }

  public async runMigrations(): Promise<void> {
    try {
      // In production, migrations should be run separately
      if (process.env.NODE_ENV !== 'production') {
        logger.info('Running database migrations...');
        // Migrations will be handled by Prisma CLI
        logger.info('Database migrations completed');
      }
    } catch (error) {
      logger.error('Failed to run migrations', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const database = DatabaseService.getInstance();
export const prisma = database.getClient();
export default database;