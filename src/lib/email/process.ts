import { createAdminClient } from '../supabase/admin';
import { getEmailProvider } from './index';
import { logger } from '../logger';

export async function processEmailNotification(feedbackId: string) {
  const admin = createAdminClient();
  const emailProvider = getEmailProvider();

  // 1. Claim the job atomically — only proceeds if nobody else has claimed it
  const { data: claimed } = await admin
    .from('feedback')
    .update({ email_sent_at: new Date().toISOString() })
    .eq('id', feedbackId)
    .is('email_sent_at', null)
    .select('id')
    .maybeSingle();

  if (!claimed) {
    logger.info(
      'Email already sent (or being sent) by another worker, skipping',
      { feedbackId },
    );
    return;
  }

  // 2. Fetch the feedback and project owner's details
  const { data: feedback, error: feedbackError } = await admin
    .from('feedback')
    .select(
      `
      message,
      page_url,
      created_at,
      projects!inner (
        name,
        user_id
      )
    `,
    )
    .eq('id', feedbackId)
    .single();

  if (feedbackError || !feedback) {
    // Release the claim if feedback somehow disappeared, though unlikely
    await admin
      .from('feedback')
      .update({ email_sent_at: null })
      .eq('id', feedbackId);
    throw new Error(`Feedback not found for ID: ${feedbackId}`);
  }

  const projectData = Array.isArray(feedback.projects)
    ? feedback.projects[0]
    : feedback.projects;
  const projectId = projectData?.name || 'Unknown Project';
  const userId = projectData?.user_id;

  if (!userId) {
    throw new Error(`Project for feedback ${feedbackId} has no owner`);
  }

  // Fetch user's email from auth.users (requires admin client)
  const { data: userData, error: userError } =
    await admin.auth.admin.getUserById(userId);
  if (userError || !userData?.user?.email) {
    throw new Error(`Could not fetch owner email for user: ${userId}`);
  }

  const ownerEmail = userData.user.email;

  // 2.5 Prevent actual emails from being sent to our E2E test user
  if (ownerEmail === 'playwright-e2e@feedbackflow.app') {
    logger.info('[Test Mode] Bypassing actual email delivery for E2E test user', { feedbackId, ownerEmail });
    return;
  }

  // 3. Format the email
  const emailHtml = `
    <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
      <h2>New feedback for ${projectId}</h2>
      <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0; font-size: 16px;">"${feedback.message}"</p>
      </div>
      ${feedback.page_url ? `<p style="color: #71717a; font-size: 14px;">Submitted from: <a href="${feedback.page_url}">${feedback.page_url}</a></p>` : ''}
      <div style="margin-top: 32px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" style="background: #18181b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">View Dashboard</a>
      </div>
    </div>
  `;

  // 4. Send the email
  const result = await emailProvider.sendEmail({
    to: ownerEmail,
    subject: `New Feedback: ${projectId}`,
    html: emailHtml,
  });

  if (!result.success) {
    // Send failed — release the claim so a retry can actually resend
    await admin
      .from('feedback')
      .update({ email_sent_at: null })
      .eq('id', feedbackId);
    throw new Error(`Email provider failed: ${JSON.stringify(result.error)}`);
  }

  logger.info('Successfully sent email notification', {
    feedbackId,
    ownerEmail,
  });
}
