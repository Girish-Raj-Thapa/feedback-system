import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { isAllowedOrigin } from '@/lib/domain';

export const dynamic = 'force-dynamic';

const CORS_BASE = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const CACHE_HEADERS = {
  success: {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
  },
  notFound: {
    'Cache-Control': 'public, max-age=60, s-maxage=60',
  },
  inactive: {
    'Cache-Control': 'public, max-age=300, s-maxage=300',
  },
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { ...CORS_BASE, 'Access-Control-Max-Age': '86400' },
  });
}

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key');

  if (!key) {
    return NextResponse.json(
      { error: 'Missing key parameter' },
      { status: 400, headers: { ...CORS_BASE, ...CACHE_HEADERS.notFound } },
    );
  }

  const supabase = createAdminClient();

  // 1. Fetch project and user ID
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(
      'id, user_id, website_url, widget_position, widget_color, widget_text, widget_theme, widget_border_radius, widget_icon, widget_title, is_active',
    )
    .eq('public_key', key)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404, headers: { ...CORS_BASE, ...CACHE_HEADERS.notFound } },
    );
  }

  if (!project.is_active) {
    return NextResponse.json(
      { error: 'Project is inactive' },
      { status: 403, headers: { ...CORS_BASE, ...CACHE_HEADERS.inactive } },
    );
  }

  // 2. Security check: Verify the Origin header matches the registered website domain
  const origin =
    request.headers.get('origin') || request.headers.get('referer');
  if (!isAllowedOrigin(origin, project.website_url)) {
    return NextResponse.json(
      { error: 'Unauthorized origin' },
      { status: 403, headers: { ...CORS_BASE, ...CACHE_HEADERS.inactive } }, // Using inactive cache for unauthorized origin to prevent spamming
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
      turnstile_site_key: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null,
    },
    { headers: { ...CORS_BASE, ...CACHE_HEADERS.success } },
  );
}
