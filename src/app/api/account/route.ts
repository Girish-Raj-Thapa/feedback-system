import { NextRequest, NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { accountRateLimiter } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';
// Assuming enqueueEmailNotification can handle a 'account_deleted' job type.
// For now, we will add a comment if we don't have the exact method for this.
// import { enqueueEmailNotification } from '@/jobs/producers/email.producer';

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required to confirm deletion'),
});

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verify active user using getUser() (checks live DB, not just local JWT)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // 2. Rate Limiting
    const ip =
      request.headers.get('x-forwarded-for') ||
      (request as any).ip ||
      'unknown-ip';
    const rateLimitId = `account_del_${userId}_${ip}`;

    const limitResult = await accountRateLimiter.limit(rateLimitId);
    if (!limitResult.success) {
      logger.warn('Rate limit exceeded for account deletion', { userId, ip });
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // 3. Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = deleteAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }
    const { password } = parsed.data;

    // 4. Re-authenticate using the current password to ensure intent and security
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password,
    });

    if (signInError) {
      logger.warn('Failed re-authentication during account deletion', { userId });
      return NextResponse.json(
        { error: 'Incorrect password' },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    // 5. Phase E: Billing - Cancel Paddle Subscription
    const { data: subscription } = await admin
      .from('subscriptions')
      .select('provider_subscription_id')
      .eq('user_id', userId)
      .single();

    if (subscription?.provider_subscription_id) {
      try {
        const { Paddle, Environment } = await import('@paddle/paddle-node-sdk');
        const paddle = new Paddle(process.env.PADDLE_SECRET_KEY || '', {
          environment:
            process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox'
              ? Environment.sandbox
              : Environment.production,
        });

        // Cancel the subscription immediately so they aren't billed again
        await paddle.subscriptions.cancel(
          subscription.provider_subscription_id,
          { effectiveFrom: 'immediately' }
        );
        logger.info('Canceled Paddle subscription before account deletion', { userId });
      } catch (err) {
        logger.error('Failed to cancel Paddle subscription', { userId }, err as Error);
        // We do NOT block deletion here; if Paddle fails, the account should still be deleted,
        // but it leaves an orphan subscription requiring manual cleanup.
      }
    }

    // 6. Audit Trail: Log the deletion to account_deletion_logs
    const { error: logError } = await admin
      .from('account_deletion_logs')
      .insert({
        deleted_user_id: userId,
        deleted_email: user.email,
      });

    if (logError) {
      logger.error('Failed to write account deletion log', { userId }, logError);
      return NextResponse.json(
        { error: 'Failed to process deletion safely' },
        { status: 500 }
      );
    }

    // 7. Enqueue confirmation email (optional / recommended)
    // after(async () => {
    //   await enqueueAccountDeletedEmail(user.email);
    // });

    // 8. Execute Deletion: This cascades and wipes projects, feedback, subscriptions
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

    if (deleteError) {
      logger.error('Failed to delete user account', { userId }, deleteError);
      return NextResponse.json(
        { error: 'Failed to delete account. Please try again later.' },
        { status: 500 }
      );
    }

    // Force sign out on the current session to clear cookies
    await supabase.auth.signOut();

    logger.info('User account successfully deleted', { userId });
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    logger.error('Unexpected error during account deletion', undefined, error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
