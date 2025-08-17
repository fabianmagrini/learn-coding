import { app } from './app';
import { config } from './shared/utils/config';
import { logger } from './shared/utils/logger';
import { database } from './database/prisma';
import { redis } from './database/redis';

const PORT = config.PORT || 3000;

async function initializeServices() {
  try {
    // Connect to database
    await database.connect();
    logger.info('Database connection established');

    // Connect to Redis
    await redis.connect();
    logger.info('Redis connection established');

    // Run database migrations in development
    if (config.NODE_ENV === 'development') {
      await database.runMigrations();
    }

  } catch (error) {
    logger.error('Failed to initialize services', { error });
    throw error;
  }
}

async function startServer() {
  try {
    // Initialize database and Redis connections
    await initializeServices();
    
    const server = app.listen(PORT, () => {
      logger.info('Enhanced shared services server running', {
        port: PORT,
        environment: config.NODE_ENV,
        llmProvider: config.LLM_PROVIDER,
        database: 'PostgreSQL',
        cache: 'Redis',
      });
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutdown signal received, closing connections...');
      
      try {
        // Close HTTP server
        server.close(() => {
          logger.info('HTTP server closed');
        });

        // Close database connections
        await database.disconnect();
        logger.info('Database disconnected');

        // Close Redis connection
        await redis.disconnect();
        logger.info('Redis disconnected');

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();

export { startServer };