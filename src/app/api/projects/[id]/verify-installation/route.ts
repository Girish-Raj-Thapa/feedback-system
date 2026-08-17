import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/projects/[id]/verify-installation
 *
 * Checks whether the FeedbackFlow widget script is present on the project's
 * registered website by doing a server-side page fetch and inspecting the HTML.
 *
 * Environment-aware:
 *   - NEXT_PUBLIC_APP_URL=http://localhost:3000  → looks for localhost:3000/widget-v1.js
 *   - NEXT_PUBLIC_APP_URL=https://www.feedbackflow.app → looks for feedbackflow.app/widget-v1.js
 *
 * On a verified match (script + project key both found), stamps
 * installation_verified_at on the project row.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch the project (RLS ensures user owns it)
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, website_url, public_key')
    .eq('id', id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const { website_url, public_key } = project;

  // ── App URL (env-driven) ─────────────────────────────────────────────────
  // This is where widget-v1.js is hosted. Comes from NEXT_PUBLIC_APP_URL.
  //   Local dev:   http://localhost:3000
  //   Production:  https://www.feedbackflow.app
  //
  // The widget script URL that we expect to find in the customer's HTML is:
  //   {APP_URL}/widget-v1.js
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || 'https://www.feedbackflow.app'
  ).replace(/\/$/, ''); // strip trailing slash

  const widgetScriptUrl = `${appUrl}/widget-v1.js`;

  // ── Validate and normalise the customer's website URL ───────────────────
  let fetchUrl: string;
  try {
    const parsed = new URL(
      website_url.startsWith('http') ? website_url : `https://${website_url}`,
    );
    fetchUrl = parsed.toString();
  } catch {
    return NextResponse.json(
      {
        reachable: false,
        scriptFound: false,
        projectIdMatch: false,
        message: 'The registered website URL is invalid.',
      },
      { status: 200 },
    );
  }

  // ── Fetch the customer's page ────────────────────────────────────────────
  // localhost is intentionally supported: when APP_URL=http://localhost:3000,
  // we are running locally and can fetch our own pages server-side.
  let html = '';
  let reachable = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(fetchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FeedbackFlow-Verifier/1.0',
        'Cache-Control': 'no-cache',
      },
    });
    clearTimeout(timeout);

    reachable = res.ok;
    if (reachable) html = await res.text();
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    return NextResponse.json(
      {
        reachable: false,
        scriptFound: false,
        projectIdMatch: false,
        message: isTimeout
          ? 'Your website took too long to respond (>10s). Try again or check the URL.'
          : 'Could not reach your website. Make sure it is accessible and the URL is correct.',
      },
      { status: 200 },
    );
  }

  if (!reachable) {
    return NextResponse.json(
      {
        reachable: false,
        scriptFound: false,
        projectIdMatch: false,
        message:
          'Your website returned an error status. Check that the URL is live.',
      },
      { status: 200 },
    );
  }

  // ── Script presence check ────────────────────────────────────────────────
  // Primary signal: the exact widget script URL from this environment.
  //   Local:  html contains "http://localhost:3000/widget-v1.js"
  //   Prod:   html contains "https://www.feedbackflow.app/widget-v1.js"
  //
  // Fallback signals (for resilience):
  //   - "widget-v1.js" alone (relative path or any host)
  //   - data-project attribute (always present, regardless of script host)
  const scriptFound =
    html.includes(widgetScriptUrl) ||
    html.includes('widget-v1.js') ||
    html.includes('data-project="fb_pub_') ||
    html.includes("data-project='fb_pub_");

  // ── Project key match ────────────────────────────────────────────────────
  // The public key must appear in the page HTML as the data-project value,
  // proving the *right* project is installed (not just any FeedbackFlow widget).
  const projectIdMatch = html.includes(public_key);

  // ── Stamp verified_at on full success ────────────────────────────────────
  if (scriptFound && projectIdMatch) {
    const admin = createAdminClient();
    await admin
      .from('projects')
      .update({ installation_verified_at: new Date().toISOString() })
      .eq('id', id);
  }

  return NextResponse.json({ reachable, scriptFound, projectIdMatch });
}
