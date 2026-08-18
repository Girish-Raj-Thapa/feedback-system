import { emailQueue, EmailJobData } from '../queues/email.queue';
import { logger } from '@/lib/logger';

export async function enqueueEmailNotification(feedbackId: string) {
  try {
    const jobData: EmailJobData = { feedbackId };
    await emailQueue.add('send-notification', jobData);
    logger.info('Email notification job enqueued', { feedbackId });
  } catch (error) {
    logger.error('Failed to enqueue email notification', { feedbackId }, error);
    throw error;
  }
}
