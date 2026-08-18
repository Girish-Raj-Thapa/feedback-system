import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // Load Next.js local env variables
import { logger } from '../src/lib/logger';
import { setupEmailWorker } from './workers/email.worker';

async function bootstrap() {
  logger.info('Starting FeedbackFlow Background Workers...');

  try {
    const emailWorker = setupEmailWorker();

    // Handle graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down workers...');
      await emailWorker.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    logger.info('Workers started successfully. Waiting for jobs...');
  } catch (error) {
    logger.error('Failed to start workers', undefined, error);
    process.exit(1);
  }
}

bootstrap();
