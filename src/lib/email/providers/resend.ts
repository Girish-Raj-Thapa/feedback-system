import { Resend } from 'resend';
import { EmailProvider } from '../index';
import { logger } from '@/lib/logger';

export class ResendProvider implements EmailProvider {
  private resend: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('RESEND_API_KEY is missing');
      } else {
        logger.warn(
          'RESEND_API_KEY is missing. ResendProvider will fail to send emails.',
        );
      }
    }
    this.resend = new Resend(apiKey);
  }

  async sendEmail({
    to,
    subject,
    html,
  }: {
    to: string;
    subject: string;
    html: string;
  }) {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<{ success: boolean; error: Error }>(
        (_, reject) => {
          setTimeout(() => reject(new Error('Resend API timeout')), 10000);
        },
      );

      // Wrap the resend call in a race with the timeout
      const resendPromise = this.resend.emails
        .send({
          from: 'FeedbackFlow <notifications@feedbackflow.app>', // Must be a verified domain on Resend
          to,
          subject,
          html,
        })
        .then(({ data, error }) => {
          if (error) {
            logger.error('Resend API error', undefined, error);
            return { success: false, error };
          }
          return { success: true, id: data?.id };
        });

      return await Promise.race([resendPromise, timeoutPromise]);
    } catch (error) {
      logger.error('Failed to send email via Resend', undefined, error);
      return { success: false, error };
    }
  }
}
