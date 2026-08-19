import { NextRequest, NextResponse } from 'next/server';
import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

// Initialize the Paddle Node SDK
const paddle = new Paddle(process.env.PADDLE_SECRET_KEY || '', {
  environment:
    process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox'
      ? Environment.sandbox
      : Environment.production,
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('paddle-signature') || '';
    const secret = process.env.PADDLE_WEBHOOK_SECRET || '';

    let eventData;
    try {
      // Unmarshal simultaneously verifies the signature and parses the payload
      eventData = await paddle.webhooks.unmarshal(rawBody, secret, signature);
    } catch (e) {
      logger.error(
        'Paddle webhook signature verification failed',
        undefined,
        e as Error,
      );
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    switch (eventData.eventType) {
      case 'subscription.created':
      case 'subscription.updated': {
        const subscription = eventData.data as any; // Type bypass for flexibility
        const customData = subscription.customData || {};
        const userId = customData.user_id;

        if (!userId) {
          logger.error('Missing user_id in Paddle subscription customData', {
            subscriptionId: subscription.id,
          });
          return NextResponse.json(
            { error: 'Missing user_id in payload' },
            { status: 400 },
          );
        }

        const { error } = await admin
          .from('subscriptions')
          .update({
            plan: 'pro',
            status: subscription.status, // e.g., 'active', 'past_due'
            provider_customer_id: subscription.customerId,
            provider_subscription_id: subscription.id,
            current_period_start: subscription.currentBillingPeriod?.startsAt,
            current_period_end: subscription.currentBillingPeriod?.endsAt,
          })
          .eq('user_id', userId);

        if (error) {
          logger.error('Failed to update subscription to pro', {
            userId,
            dbError: error,
          });
          return NextResponse.json(
            { error: 'Database update failed' },
            { status: 500 },
          );
        }

        logger.info('Successfully updated user to pro plan', {
          userId,
          subscriptionId: subscription.id,
        });
        break;
      }

      case 'subscription.canceled': {
        const subscription = eventData.data as any;
        const customData = subscription.customData || {};
        const userId = customData.user_id;

        if (!userId) {
          logger.error('Missing user_id in Paddle canceled event', {
            subscriptionId: subscription.id,
          });
          return NextResponse.json(
            { error: 'Missing user_id in payload' },
            { status: 400 },
          );
        }

        const { error } = await admin
          .from('subscriptions')
          .update({
            plan: 'free',
            status: 'canceled',
            // Keep provider IDs for audit but plan reverts to free
          })
          .eq('user_id', userId);

        if (error) {
          logger.error('Failed to downgrade subscription to free', {
            userId,
            dbError: error,
          });
          return NextResponse.json(
            { error: 'Database update failed' },
            { status: 500 },
          );
        }

        logger.info('Successfully downgraded user to free plan', {
          userId,
          subscriptionId: subscription.id,
        });
        break;
      }

      default:
        // Always return 200 for unhandled events so Paddle knows we received it
        logger.info('Unhandled Paddle webhook event', {
          eventType: eventData.eventType,
        });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    logger.error(
      'Unhandled error in Paddle webhook handler',
      undefined,
      error as Error,
    );
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
