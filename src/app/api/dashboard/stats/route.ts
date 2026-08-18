import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Fetch Analytics Counts (Total, Open, Archived)
    // RLS policy "feedback_select_own_project" ensures we only count feedback
    // belonging to projects owned by the authenticated user.
    const [totalCountRes, openCountRes, resolvedCountRes] = await Promise.all([
      supabase.from('feedback').select('*', { count: 'exact', head: true }),
      supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open'),
      supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved'),
    ]);

    const stats = {
      totalFeedback: totalCountRes.count || 0,
      openFeedback: openCountRes.count || 0,
      resolvedFeedback: resolvedCountRes.count || 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[API] Failed to fetch dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 },
    );
  }
}
