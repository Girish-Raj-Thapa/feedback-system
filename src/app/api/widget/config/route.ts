import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { isAllowedOrigin } from '@/lib/domain';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key');

  if (!key) {
    return NextResponse.json(
      { error: 'Missing key parameter' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const supabase = createAdminClient();

  // 1. Fetch project and user ID
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(
      'id, user_id, website_url, widget_position, widget_color, widget_text, widget_theme, widget_border_radius, widget_icon, widget_title',
    )
    .eq('public_key', key)
    .eq('is_active', true)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  // 2. Security check: Verify the Origin header matches the registered website domain
  const origin =
    request.headers.get('origin') || request.headers.get('referer');
  if (!isAllowedOrigin(origin, project.website_url)) {
    return NextResponse.json(
      { error: 'Unauthorized origin' },
      { status: 403, headers: CORS_HEADERS },
    );
  }

  // 3. Usage Limits Check
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', project.user_id)
    .single();

  let usageExceeded = false;
  if (sub?.plan === 'free') {
    const { getMonthlyFeedbackCount } = await import('@/lib/usage');
    const { FREE_TIER_LIMIT } = await import('@/lib/permissions');

    const count = await getMonthlyFeedbackCount(project.user_id);
    if (count >= FREE_TIER_LIMIT) {
      usageExceeded = true;
    }
  }

  if (usageExceeded) {
    return NextResponse.json(
      { isActive: false, reason: 'quota_exceeded' },
      { headers: CORS_HEADERS },
    );
  }

  return NextResponse.json(
    {
      isActive: true,
      position: project.widget_position,
      color: project.widget_color,
      text: project.widget_text,
      theme: project.widget_theme,
      border_radius: project.widget_border_radius,
      icon: project.widget_icon,
      title: project.widget_title,
    },
    { headers: CORS_HEADERS },
  );
}
