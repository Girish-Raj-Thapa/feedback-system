import { Queue } from 'bullmq';
import { redisConnection } from '@/lib/redis';

// Define the shape of the job data
export interface EmailJobData {
  feedbackId: string;
}

export const emailQueue = new Queue<EmailJobData>('email-notifications', {
  connection: redisConnection,
  // NOTE: defaultJobOptions applies to ALL job types on this queue.
  // If you add a new producer for a different job type, confirm these
  // retry/backoff settings are appropriate for it too.
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true, // Don't clutter Redis with old jobs
    removeOnFail: false, // Keep failed jobs so we can inspect them
  },
});
