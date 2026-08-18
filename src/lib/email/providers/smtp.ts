import nodemailer from 'nodemailer';
import { EmailProvider } from '../index';
import { logger } from '@/lib/logger';

export class SMTPProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Supabase local Inbucket settings
    const host = process.env.SMTP_HOST || 'localhost';
    const port = parseInt(process.env.SMTP_PORT || '54325', 10);
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false, // Inbucket doesn't use TLS
      auth: user ? { user, pass } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
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
      const info = await this.transporter.sendMail({
        from: '"FeedbackFlow Local" <notifications@feedbackflow.local>',
        to,
        subject,
        html,
      });

      logger.info('Email sent via local SMTP', { messageId: info.messageId });
      return { success: true, id: info.messageId };
    } catch (error) {
      logger.error('Failed to send email via SMTP', undefined, error);
      return { success: false, error };
    }
  }
}
