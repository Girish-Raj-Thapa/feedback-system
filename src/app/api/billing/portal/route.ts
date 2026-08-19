import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import { logger } from '@/lib/logger';
import { RedisRateLimiter } from '@/lib/rate-limit';

// Configured for 5 requests per 60 seconds for portal access
const portalRateLimiter = new RedisRateLimiter(5, 60);

// Initialize the Paddle Node SDK
const paddle = new Paddle(process.env.PADDLE_SECRET_KEY || '', {
  environment:
    process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox'
      ? Environment.sandbox
      : Environment.production,
});

export async function GET(req: NextRequest) {
  try {
    // 1. Rate Limiting (Prevent abuse)
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const { success } = await portalRateLimiter.limit(`portal_${ip}`);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // 2. Authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Fetch user's Paddle Customer ID
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('provider_customer_id, provider_subscription_id, plan')
      .eq('user_id', user.id)
      .single();

    if (!subscription || !subscription.provider_customer_id) {
      return NextResponse.json(
        { error: 'No active Paddle customer found for this user.' },
        { status: 404 }
      );
    }

    if (subscription.plan !== 'pro') {
      return NextResponse.json(
        { error: 'User is not on a Pro plan.' },
        { status: 403 }
      );
    }

    // 4. Generate Customer Portal Session
    // We pass the customer ID and specifically lock it to their subscription ID for security
    const session = await paddle.customerPortalSessions.create(
      subscription.provider_customer_id,
      subscription.provider_subscription_id
        ? [subscription.provider_subscription_id]
        : []
    );

    // 5. Return the URL
    if (session && session.urls && session.urls.general && session.urls.general.overview) {
      return NextResponse.json({ url: session.urls.general.overview }, { status: 200 });
    } else {
      logger.error('Paddle returned session without a valid URL', { userId: user.id });
      return NextResponse.json({ error: 'Failed to generate portal URL' }, { status: 500 });
    }
  } catch (error: any) {
    logger.error('Failed to create customer portal session', undefined, error as Error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
