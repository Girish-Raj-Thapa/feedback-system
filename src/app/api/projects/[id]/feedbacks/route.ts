import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || 'all'; // all, open, resolved
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  
  if (page < 1 || limit < 1 || limit > 100) {
    return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 });
  }

  const offset = (page - 1) * limit;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify project ownership
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', user.id)
    .eq('id', id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
  }

  // 1. Fetch Analytics Counts (Total, Open, Archived)
  const [totalCountRes, openCountRes, resolvedCountRes] = await Promise.all([
    supabase.from('feedback').select('*', { count: 'exact', head: true }).eq('project_id', id),
    supabase.from('feedback').select('*', { count: 'exact', head: true }).eq('project_id', id).eq('status', 'open'),
    supabase.from('feedback').select('*', { count: 'exact', head: true }).eq('project_id', id).eq('status', 'resolved')
  ]);

  const analytics = {
    total: totalCountRes.count || 0,
    open: openCountRes.count || 0,
    resolved: resolvedCountRes.count || 0
  };

  // 2. Fetch Paginated & Filtered Data
  let query = supabase
    .from('feedback')
    .select('*', { count: 'exact' })
    .eq('project_id', id);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (search) {
    // Search in message OR email
    query = query.or(`message.ilike.%${search}%,email.ilike.%${search}%`);
  }

  // Sorting
  const isAscending = sortOrder === 'asc';
  if (['created_at', 'status', 'email'].includes(sortBy)) {
    query = query.order(sortBy, { ascending: isAscending });
  } else {
    query = query.order('created_at', { ascending: false }); // Fallback
  }

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[API] Failed to fetch feedback:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }

  return NextResponse.json({
    data,
    analytics,
    meta: {
      page,
      limit,
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      hasMore: offset + limit < (count || 0)
    }
  });
}
