'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { FeedbackChart } from '@/components/ui/FeedbackChart';
import { MessageSquare, Clock, CheckCircle2, TrendingUp, TrendingDown, Timer, AlertCircle } from 'lucide-react';

interface OverviewData {
  analytics: {
    total: number;
    newThisWeek: number;
    newThisWeekTrend: number;
    open: number;
    resolutionRate: number;
    avgTTR: string;
  };
  recentActivity: Array<{
    id: string;
    email: string | null;
    message: string;
    status: string;
    created_at: string;
  }>;
  chartData: Array<{ date: string; count: number }>;
  devices: {
    browsers: Array<{ name: string; percentage: number }>;
    os: Array<{ name: string; percentage: number }>;
  };
  topPages: Array<{ url: string; title: string; count: number }>;
}

export default function ProjectDashboardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!params?.id) return;
      try {
        const [projectRes, overviewRes] = await Promise.all([
          fetch(`/api/projects/${params.id}`),
          fetch(`/api/projects/${params.id}/overview`)
        ]);

        if (projectRes.ok && overviewRes.ok) {
          const projectData = await projectRes.json();
          const overviewData = await overviewRes.json();
          setProject(projectData);
          setOverview(overviewData);
        } else if (projectRes.status === 404) {
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Failed to fetch project or overview data', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params?.id, router]);

  if (loading) {
    return (
      <div className="p-9 flex justify-center">
        <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project || !overview) return null;

  const { analytics, recentActivity, chartData, devices, topPages } = overview as unknown as OverviewData;

  return (
    <div className="p-6 lg:p-9 max-w-7xl mx-auto space-y-9">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight mb-1">
          {project.name}
        </h1>
        <p className="text-ink-muted">
          Dashboard overview and analytics.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Metric Card 1 */}
        <div className="bg-bg-primary border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-medium text-ink-muted mb-1 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Total Feedback
          </h3>
          <p className="text-3xl font-bold text-ink mt-2">{analytics.total}</p>
        </div>

        {/* Metric Card 2 */}
        <div className="bg-bg-primary border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-medium text-ink-muted mb-1 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              New This Week
            </h3>
            {analytics.newThisWeekTrend !== 0 && (
              <span className={`text-xs font-medium flex items-center gap-0.5 ${analytics.newThisWeekTrend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {analytics.newThisWeekTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(analytics.newThisWeekTrend)}%
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-ink mt-2">{analytics.newThisWeek}</p>
        </div>

        {/* Metric Card 3 */}
        <div className="bg-bg-primary border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-medium text-ink-muted mb-1 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Open Issues
          </h3>
          <p className="text-3xl font-bold text-ink mt-2">{analytics.open}</p>
        </div>

        {/* Metric Card 4 */}
        <div className="bg-bg-primary border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-medium text-ink-muted mb-1 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Resolution Rate
          </h3>
          <p className="text-3xl font-bold text-ink mt-2">{analytics.resolutionRate}%</p>
        </div>

        {/* Metric Card 5 */}
        <div className="bg-bg-primary border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-medium text-ink-muted mb-1 flex items-center gap-2">
            <Timer className="w-4 h-4" />
            Avg Time to Resolve
          </h3>
          <p className="text-3xl font-bold text-ink mt-2 whitespace-nowrap">{analytics.avgTTR}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <Card.Header>
              <h2 className="text-lg font-medium text-ink">Feedback Trends (30 Days)</h2>
            </Card.Header>
            <Card.Body>
              <div className="pt-4">
                <FeedbackChart data={chartData} />
              </div>
            </Card.Body>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full">
            <Card.Header>
              <h2 className="text-lg font-medium text-ink">Recent Activity</h2>
            </Card.Header>
            <Card.Body className="p-0">
              {recentActivity.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <p className="text-ink-muted">No activity data available yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="p-4 hover:bg-bg-subtle transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate">
                            {activity.email || 'Anonymous'}
                          </p>
                          <p className="text-sm text-ink-muted line-clamp-2 mt-0.5">
                            {activity.message}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider ${
                          activity.status === 'open' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {activity.status}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-ink-muted">
                        {new Date(activity.created_at).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card>
          <Card.Header>
            <h2 className="text-lg font-medium text-ink">Top Pages</h2>
            <p className="text-sm text-ink-muted mt-1">Pages with the most feedback over the last 30 days.</p>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="overflow-x-auto p-6 pt-0">
              <table className="w-full text-sm text-left">
                <thead className="text-ink-muted border-b border-border-subtle">
                  <tr>
                    <th className="pb-3 font-medium">Page Title / URL</th>
                    <th className="pb-3 font-medium text-right">Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {topPages?.map((page) => (
                    <tr key={page.url}>
                      <td className="py-4">
                        <div className="text-ink font-medium truncate max-w-[250px]" title={page.title}>{page.title}</div>
                        <div className="text-ink-muted text-xs truncate max-w-[250px]" title={page.url}>{page.url}</div>
                      </td>
                      <td className="py-4 text-right font-medium text-ink">{page.count}</td>
                    </tr>
                  ))}
                  {(!topPages || topPages.length === 0) && (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-ink-muted">No page data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>

        {/* Device Breakdown */}
        <Card>
          <Card.Header>
            <h2 className="text-lg font-medium text-ink">Device & Environment</h2>
            <p className="text-sm text-ink-muted mt-1">Feedback distribution by browser and OS (Last 30 Days).</p>
          </Card.Header>
          <Card.Body>
            <div className="space-y-8">
              {/* Browsers */}
              <div>
                <h4 className="text-sm font-semibold text-ink mb-4 uppercase tracking-wider">Browsers</h4>
                <div className="space-y-4">
                  {devices?.browsers?.length > 0 ? devices.browsers.map((b) => (
                    <div key={b.name} className="flex items-center gap-3 text-sm">
                      <div className="w-24 text-ink truncate font-medium" title={b.name}>{b.name}</div>
                      <div className="flex-1 bg-border-subtle rounded-full h-2 overflow-hidden">
                        <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${b.percentage}%` }} />
                      </div>
                      <div className="w-10 text-right text-ink-muted font-medium">{b.percentage}%</div>
                    </div>
                  )) : (
                    <p className="text-sm text-ink-muted">No browser data available.</p>
                  )}
                </div>
              </div>

              {/* Operating Systems */}
              <div>
                <h4 className="text-sm font-semibold text-ink mb-4 uppercase tracking-wider">Operating Systems</h4>
                <div className="space-y-4">
                  {devices?.os?.length > 0 ? devices.os.map((o) => (
                    <div key={o.name} className="flex items-center gap-3 text-sm">
                      <div className="w-24 text-ink truncate font-medium" title={o.name}>{o.name}</div>
                      <div className="flex-1 bg-border-subtle rounded-full h-2 overflow-hidden">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${o.percentage}%` }} />
                      </div>
                      <div className="w-10 text-right text-ink-muted font-medium">{o.percentage}%</div>
                    </div>
                  )) : (
                    <p className="text-sm text-ink-muted">No OS data available.</p>
                  )}
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>

    </div>
  );
}
