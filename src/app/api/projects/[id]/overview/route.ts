import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
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

  // 1. Fetch Analytics Counts (Total, Open, Resolved)
  const [totalCountRes, openCountRes, resolvedCountRes] = await Promise.all([
    supabase.from('feedback').select('*', { count: 'exact', head: true }).eq('project_id', id),
    supabase.from('feedback').select('*', { count: 'exact', head: true }).eq('project_id', id).eq('status', 'open'),
    supabase.from('feedback').select('*', { count: 'exact', head: true }).eq('project_id', id).eq('status', 'resolved')
  ]);

  const total = totalCountRes.count || 0;
  const open = openCountRes.count || 0;
  const resolved = resolvedCountRes.count || 0;
  
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // New this week and last week for trend
  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  const { count: newThisWeek } = await supabase
    .from('feedback')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', id)
    .gte('created_at', oneWeekAgo.toISOString());

  const { count: newLastWeek } = await supabase
    .from('feedback')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', id)
    .gte('created_at', twoWeeksAgo.toISOString())
    .lt('created_at', oneWeekAgo.toISOString());

  const currentWeekCount = newThisWeek || 0;
  const prevWeekCount = newLastWeek || 0;
  
  let newThisWeekTrend = 0;
  if (prevWeekCount === 0) {
    newThisWeekTrend = currentWeekCount > 0 ? 100 : 0;
  } else {
    newThisWeekTrend = Math.round(((currentWeekCount - prevWeekCount) / prevWeekCount) * 100);
  }

  // Calculate Average TTR (Time to Resolution)
  const { data: resolvedItems } = await supabase
    .from('feedback')
    .select('created_at, updated_at')
    .eq('project_id', id)
    .eq('status', 'resolved');

  let avgTTRHours = 0;
  if (resolvedItems && resolvedItems.length > 0) {
    let totalMs = 0;
    resolvedItems.forEach(item => {
      const created = new Date(item.created_at).getTime();
      const updated = new Date(item.updated_at).getTime();
      totalMs += (updated - created);
    });
    // Convert ms to hours
    avgTTRHours = totalMs / resolvedItems.length / (1000 * 60 * 60);
  }
  
  let avgTTRFormatted = "N/A";
  if (resolvedItems && resolvedItems.length > 0) {
    if (avgTTRHours < 1) {
      avgTTRFormatted = `${Math.round(avgTTRHours * 60)} Mins`;
    } else if (avgTTRHours < 24) {
      avgTTRFormatted = `${Math.round(avgTTRHours * 10) / 10} Hours`;
    } else {
      avgTTRFormatted = `${Math.round((avgTTRHours / 24) * 10) / 10} Days`;
    }
  }

  const analytics = {
    total,
    open,
    resolved,
    resolutionRate,
    newThisWeek: currentWeekCount,
    newThisWeekTrend,
    avgTTR: avgTTRFormatted,
  };

  // 2. Fetch Recent Activity (last 3)
  const { data: recentActivity, error: recentError } = await supabase
    .from('feedback')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(3);

  if (recentError) {
    console.error('[API] Failed to fetch recent feedback:', recentError);
  }

  // 3. Fetch Chart Data & Demographics Data
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: allFeedbacks } = await supabase
    .from('feedback')
    .select('created_at, browser, os, device_type, page_url, page_title')
    .eq('project_id', id)
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Chart Data Processing
  const chartDataMap: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    chartDataMap[dateStr] = 0;
  }

  // Devices & Top Pages Processing
  const browserMap: Record<string, number> = {};
  const osMap: Record<string, number> = {};
  const pageMap: Record<string, { count: number; title: string }> = {};
  let totalFeedbacksIn30Days = 0;

  if (allFeedbacks) {
    totalFeedbacksIn30Days = allFeedbacks.length;
    allFeedbacks.forEach(fb => {
      // chart
      const dateStr = fb.created_at.split('T')[0];
      if (chartDataMap[dateStr] !== undefined) {
        chartDataMap[dateStr]++;
      }
      
      // browser
      if (fb.browser) {
        browserMap[fb.browser] = (browserMap[fb.browser] || 0) + 1;
      }
      
      // os
      if (fb.os) {
        osMap[fb.os] = (osMap[fb.os] || 0) + 1;
      }
      
      // top pages
      if (fb.page_url) {
        // clean url by removing query params and hash for grouping, optionally
        try {
          const urlObj = new URL(fb.page_url);
          const cleanUrl = urlObj.pathname;
          if (!pageMap[cleanUrl]) {
            pageMap[cleanUrl] = { count: 0, title: fb.page_title || cleanUrl };
          }
          pageMap[cleanUrl].count++;
        } catch {
          // fallback if invalid URL
          if (!pageMap[fb.page_url]) {
            pageMap[fb.page_url] = { count: 0, title: fb.page_title || fb.page_url };
          }
          pageMap[fb.page_url].count++;
        }
      }
    });
  }

  const chartData = Object.keys(chartDataMap).map(date => ({
    date,
    count: chartDataMap[date]
  }));

  // Format Devices
  const browserData = Object.entries(browserMap)
    .map(([name, count]) => ({ name, count, percentage: Math.round((count / totalFeedbacksIn30Days) * 100) }))
    .sort((a, b) => b.count - a.count);
    
  const osData = Object.entries(osMap)
    .map(([name, count]) => ({ name, count, percentage: Math.round((count / totalFeedbacksIn30Days) * 100) }))
    .sort((a, b) => b.count - a.count);

  // Format Pages
  const topPages = Object.entries(pageMap)
    .map(([url, data]) => ({ url, title: data.title, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // top 5

  return NextResponse.json({
    analytics,
    recentActivity: recentActivity || [],
    chartData,
    devices: {
      browsers: browserData,
      os: osData
    },
    topPages
  });
}
