import { createAdminClient } from '../supabase/admin';
import { getEmailProvider } from './index';
import { logger } from '../logger';

export async function sendQuotaWarningEmail(userId: string) {
  const admin = createAdminClient();
  const emailProvider = getEmailProvider();

  // Fetch user's email from auth.users (requires admin client)
  const { data: userData, error: userError } =
    await admin.auth.admin.getUserById(userId);

  if (userError || !userData?.user?.email) {
    logger.error(
      `Could not fetch owner email for user: ${userId} to send quota warning`,
    );
    return;
  }

  const ownerEmail = userData.user.email;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Format the email
  const emailHtml = `
    <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #18181b;">
      <h2 style="color: #ef4444;">Monthly Free Tier Limit Reached</h2>
      <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0 0 12px 0; font-size: 16px;">
          You have reached your free tier limit of feedback submissions for this month. 
          Your FeedbackFlow widgets have been temporarily disabled to prevent visitor errors.
        </p>
        <p style="margin: 0; font-size: 16px;">
          Upgrade to the Pro plan for unlimited feedback submissions, custom domains, and no branding!
        </p>
      </div>
      <div style="margin-top: 32px;">
        <a href="${appUrl}/dashboard/settings" style="background: #18181b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Upgrade to Pro</a>
      </div>
    </div>
  `;

  const result = await emailProvider.sendEmail({
    to: ownerEmail,
    subject: `Action Required: Monthly Feedback Limit Reached`,
    html: emailHtml,
  });

  if (!result.success) {
    logger.error(
      'Failed to send quota warning email',
      { userId },
      result.error,
    );
  } else {
    logger.info('Successfully sent quota warning email', {
      userId,
      ownerEmail,
    });
  }
}
