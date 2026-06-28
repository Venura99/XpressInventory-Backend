import 'dotenv/config';
import app from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/environment';
import { logger } from './utils/logger';

const start = async (): Promise<void> => {
  await connectDatabase();

  const server = app.listen(env.port, () => {
    logger.info(`GadgetXpress API running on port ${env.port} [${env.nodeEnv}]`);
    logger.info(`Health: http://localhost:${env.port}/health`);
    logger.info(`API Base: http://localhost:${env.port}${env.apiPrefix}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason);
    shutdown('unhandledRejection');
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
