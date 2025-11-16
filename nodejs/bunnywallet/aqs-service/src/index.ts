// Initialize OpenTelemetry FIRST, before any other imports
import { initializeTracing } from './telemetry/tracing';
initializeTracing();

import { createApp, initializeAdapters, startServer } from './server';
import { logger } from './telemetry/logger';

const PORT = parseInt(process.env.AQS_PORT || '8080', 10);

async function main() {
  try {
    logger.info('Starting Account Query Service...');

    // Initialize adapters
    initializeAdapters();

    // Create and start server
    const app = createApp();
    startServer(app, PORT);
  } catch (err: any) {
    logger.error('Failed to start AQS', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

main();
