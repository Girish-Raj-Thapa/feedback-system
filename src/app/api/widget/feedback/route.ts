import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAllowedOrigin } from '@/lib/domain';
import { defaultRateLimiter } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

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
    request.headers.get('x-forwarded-for') || request.ip || 'unknown-ip';
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
    .select('id, website_url')
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

  // Insert feedback using admin client (bypasses RLS — intentional for widget submissions)
  const { error: insertError } = await admin.from('feedback').insert({
    project_id: project.id,
    message,
    email: email || null,
    page_url: cleanPageUrl,
    page_title: page_title || null,
    browser: browser || null,
    os: os || null,
    device_type: device_type || null,
    screen_width: screen_width ?? null,
    screen_height: screen_height ?? null,
  });

  if (insertError) {
    logger.error('Failed to insert feedback', { public_key }, insertError);
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  // Phase C: enqueue BullMQ email notification job here

  return NextResponse.json(
    { success: true },
    { status: 201, headers: CORS_HEADERS },
  );
}
