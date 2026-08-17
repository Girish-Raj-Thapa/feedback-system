import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { generateCSV } from '@/lib/csv';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'all';
  const search = searchParams.get('search') || '';
  const format = searchParams.get('format') || 'csv';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify project ownership
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name')
    .eq('user_id', user.id)
    .eq('id', id)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: 'Project not found or access denied' },
      { status: 404 },
    );
  }

  // Fetch all matching feedbacks for export
  let query = supabase
    .from('feedback')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(`message.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: feedbacks, error } = await query;

  if (error) {
    console.error('[API] Failed to fetch feedback for export:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback for export' },
      { status: 500 },
    );
  }

  if (format === 'json') {
    return NextResponse.json({ data: feedbacks }, { status: 200 });
  }

  const headers = [
    'Date',
    'Status',
    'Email',
    'Message',
    'Device',
    'Browser',
    'OS',
    'Screen Size',
    'URL',
  ];

  const rows = (feedbacks || []).map((fb) => [
    new Date(fb.created_at).toISOString(),
    fb.status,
    fb.email || 'Anonymous',
    fb.message,
    fb.device_type || '',
    fb.browser || '',
    fb.os || '',
    fb.screen_width && fb.screen_height
      ? `${fb.screen_width}x${fb.screen_height}`
      : '',
    fb.page_url || '',
  ]);

  const csvContent = generateCSV(headers, rows);

  // Format filename with date
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_feedback_${dateStr}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
