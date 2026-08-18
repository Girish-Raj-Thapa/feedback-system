import { Worker, Job } from 'bullmq';
import { redisConnection } from '../../src/lib/redis';
import { EmailJobData } from '../../src/jobs/queues/email.queue';
import { logger } from '../../src/lib/logger';
import { processEmailNotification } from '../../src/lib/email/process';

export function setupEmailWorker() {
  const worker = new Worker<EmailJobData>(
    'email-notifications',
    async (job: Job<EmailJobData>) => {
      const { feedbackId } = job.data;
      logger.info('Processing email notification job', {
        feedbackId,
        jobId: job.id,
      });

      await processEmailNotification(feedbackId);
    },
    {
      connection: redisConnection,
      concurrency: 5, // Process up to 5 emails concurrently
    },
  );

  worker.on('failed', (job, err) => {
    logger.error('Email worker job failed', { jobId: job?.id }, err);
  });

  worker.on('error', (err) => {
    logger.error('Email worker internal error', undefined, err);
  });

  return worker;
}
