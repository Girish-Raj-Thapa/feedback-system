import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { isAllowedOrigin } from '@/lib/domain';

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

  const { data: project, error } = await supabase
    .from('projects')
    .select(
      'website_url, widget_position, widget_color, widget_text, widget_theme, widget_border_radius, widget_icon, widget_title',
    )
    .eq('public_key', key)
    .eq('is_active', true)
    .single();

  if (error || !project) {
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

  return NextResponse.json(
    {
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
