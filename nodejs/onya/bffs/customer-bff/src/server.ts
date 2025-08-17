import { app } from './app';
import { config } from './shared/utils/config';
import { logger } from './shared/utils/logger';

const PORT = config.PORT || 3001;

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Customer BFF server running on port ${PORT}`, {
    environment: config.NODE_ENV,
    sharedServicesUrl: config.SHARED_SERVICES_URL,
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Customer BFF server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Customer BFF server closed');
    process.exit(0);
  });
});

export { server };