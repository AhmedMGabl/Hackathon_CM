import { PrismaClient } from '@prisma/client';
import app from './app.js';
import { env } from './config/env.js';
import logger from './utils/logger.js';

// CMetrics Server - Railway Deployment
const prisma = new PrismaClient();

// Graceful shutdown handler
function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, closing server gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      await prisma.$disconnect();
      logger.info('Database connection closed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', { error });
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Start server
const server = app.listen(env.PORT, async () => {
  logger.info(`Server started in ${env.NODE_ENV} mode`);
  logger.info(`Listening on port ${env.PORT}`);
  logger.info(`Health check: http://localhost:${env.PORT}/healthz`);

  // Test database connection
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database', { error });
    process.exit(1);
  }
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});
