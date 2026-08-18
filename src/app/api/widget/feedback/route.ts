import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { isAllowedOrigin } from '@/lib/domain';
import { defaultRateLimiter } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { enqueueEmailNotification } from '@/jobs/producers/email.producer';
import { processEmailNotification } from '@/lib/email/process';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const feedbackSchema = z.object({
  public_key: z.string().min(1),
  message: z.string().trim().min(1, 'Message is required').max(5000),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  page_url: z.string().url().optional().or(z.literal('')),
  page_title: z.string().max(500).optional(),
  browser: z.string().max(200).optional(),
  os: z.string().max(200).optional(),
  device_type: z.enum(['desktop', 'mobile', 'tablet']).optional(),
  screen_width: z.number().int().positive().max(20000).optional(),
  screen_height: z.number().int().positive().max(20000).optional(),
  ff_website: z.string().optional(), // Honeypot field
});

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid input';
    return NextResponse.json(
      { error: firstError },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const {
    public_key,
    message,
    email,
    page_url,
    page_title,
    browser,
    os,
    device_type,
    screen_width,
    screen_height,
    ff_website,
  } = parsed.data;

  // 1. Honeypot Validation: If a bot fills this hidden field, silently drop the request
  if (ff_website) {
    logger.warn('Honeypot triggered', { public_key });
    return NextResponse.json(
      { success: true },
      { status: 201, headers: CORS_HEADERS },
    );
  }

  // 2. Rate Limiting: Limit by IP and Project
  const ip =
    request.headers.get('x-forwarded-for') ||
    (request as any).ip ||
    'unknown-ip';
  const rateLimitId = `feedback_${public_key}_${ip}`;

  const limitResult = await defaultRateLimiter.limit(rateLimitId);
  if (!limitResult.success) {
    logger.warn('Rate limit exceeded', { ip, public_key });
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: CORS_HEADERS },
    );
  }

  // 3. URL Sanitization: Strip sensitive query parameters and fragments
  let cleanPageUrl = page_url || null;
  if (cleanPageUrl) {
    try {
      const urlObj = new URL(cleanPageUrl);
      cleanPageUrl = `${urlObj.origin}${urlObj.pathname}`;
    } catch (e) {
      // If parsing fails, just use null rather than storing an invalid or sensitive string
      cleanPageUrl = null;
    }
  }

  const admin = createAdminClient();

  // Verify the project exists and is active
  const { data: project, error: projectError } = await admin
    .from('projects')
    .select('id, user_id, website_url')
    .eq('public_key', public_key)
    .eq('is_active', true)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  // Security check: Verify the Origin header matches the registered website domain
  const origin =
    request.headers.get('origin') || request.headers.get('referer');
  if (!isAllowedOrigin(origin, project.website_url)) {
    return NextResponse.json(
      { error: 'Unauthorized origin' },
      { status: 403, headers: CORS_HEADERS },
    );
  }

  // 3. Usage Limits Check & Insert (Atomic RPC)
  const { FREE_TIER_LIMIT } = await import('@/lib/permissions');

  const payload = {
    message,
    email: email || null,
    page_url: cleanPageUrl,
    page_title: page_title || null,
    browser: browser || null,
    os: os || null,
    device_type: device_type || null,
    screen_width: screen_width ?? null,
    screen_height: screen_height ?? null,
  };

  // Insert feedback using admin client (bypasses RLS — intentional for widget submissions)
  const { data: rpcResult, error: rpcError } = await admin.rpc(
    'insert_feedback_with_quota',
    {
      p_project_id: project.id,
      p_payload: payload,
      p_free_limit: FREE_TIER_LIMIT,
    },
  );

  if (rpcError) {
    if (rpcError.message.includes('quota_exceeded')) {
      logger.warn('Feedback rejected due to free tier limit', { public_key });
      return NextResponse.json(
        { error: 'Monthly quota exceeded' },
        { status: 402, headers: CORS_HEADERS },
      );
    }
    logger.error('Failed to insert feedback via RPC', { public_key }, rpcError);
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  const insertedFeedbackId = rpcResult.id;
  const newCount = rpcResult.new_count;
  const userPlan = rpcResult.plan;

  let limitReachedThisTime = false;
  if (userPlan === 'free' && newCount >= FREE_TIER_LIMIT) {
    limitReachedThisTime = true;
  }

  // Dispatch email notification
  try {
    const deliveryMethod = process.env.EMAIL_DELIVERY_METHOD || 'inline';

    if (deliveryMethod === 'queue') {
      await enqueueEmailNotification(insertedFeedbackId);
    } else {
      after(async () => {
        try {
          await processEmailNotification(insertedFeedbackId);
        } catch (err) {
          logger.error(
            'Failed inline email delivery',
            { feedbackId: insertedFeedbackId },
            err as Error,
          );
        }
      });
    }
  } catch (error) {
    logger.error(
      'Failed to enqueue email job, deleting orphaned feedback row',
      { feedbackId: insertedFeedbackId },
      error as Error,
    );
    // Compensating transaction: Delete the row we just inserted so it's not orphaned without an email
    const { error: deleteError } = await admin
      .from('feedback')
      .delete()
      .eq('id', insertedFeedbackId);
    if (deleteError) {
      logger.error(
        'CRITICAL: Failed to roll back orphaned feedback row',
        { feedbackId: insertedFeedbackId },
        deleteError,
      );
    }
    return NextResponse.json(
      { error: 'Failed to process feedback. Please try again.' },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  // Dispatch limit reached warning (Atomic claim)
  if (limitReachedThisTime) {
    after(async () => {
      try {
        const startOfMonthIso = new Date(
          Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
        ).toISOString();

        // Atomically claim the quota warning email for this month
        const { data: claimed } = await admin
          .from('subscriptions')
          .update({ last_quota_warning_sent_at: new Date().toISOString() })
          .eq('user_id', project.user_id)
          .or(
            `last_quota_warning_sent_at.is.null,last_quota_warning_sent_at.lt.${startOfMonthIso}`,
          )
          .select('id')
          .maybeSingle();

        if (claimed) {
          const { sendQuotaWarningEmail } = await import('@/lib/email/quota');
          await sendQuotaWarningEmail(project.user_id);
        }
      } catch (err) {
        logger.error(
          'Failed to send quota warning',
          { userId: project.user_id },
          err as Error,
        );
      }
    });
  }

  return NextResponse.json(
    { success: true },
    { status: 201, headers: CORS_HEADERS },
  );
}
