import { ResendProvider } from './providers/resend';
import { SMTPProvider } from './providers/smtp';
import { logger } from '@/lib/logger';

export interface EmailProvider {
  sendEmail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<{ id?: string; success: boolean; error?: any }>;
}

export function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER?.toLowerCase();

  switch (provider) {
    case 'resend':
      logger.info('Using Resend Email Provider');
      return new ResendProvider();
    case 'smtp':
      logger.info('Using SMTP Email Provider');
      return new SMTPProvider();
    default:
      // Default to SMTP for local development if not specified
      if (process.env.NODE_ENV !== 'production') {
        logger.info(
          'No EMAIL_PROVIDER set, defaulting to SMTP for local development',
        );
        return new SMTPProvider();
      }
      logger.warn('No EMAIL_PROVIDER set in production! Defaulting to Resend.');
      return new ResendProvider();
  }
}
