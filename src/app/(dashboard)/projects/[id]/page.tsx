'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';

export default function ProjectDashboardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProject() {
      if (!params?.id) return;
      try {
        const res = await fetch(`/api/projects/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data);
        } else if (res.status === 404) {
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Failed to fetch project');
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [params?.id, router]);

  if (loading) {
    return (
      <div className="p-9 flex justify-center">
        <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) return null;

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric Card 1 */}
        <div className="bg-bg-primary border border-border-subtle rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-ink-muted mb-1">Total Feedback</h3>
          <p className="text-3xl font-bold text-ink">0</p>
        </div>

        {/* Metric Card 2 */}
        <div className="bg-bg-primary border border-border-subtle rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-ink-muted mb-1">New This Week</h3>
          <p className="text-3xl font-bold text-ink">0</p>
        </div>

        {/* Metric Card 3 */}
        <div className="bg-bg-primary border border-border-subtle rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-ink-muted mb-1">Average Sentiment</h3>
          <p className="text-3xl font-bold text-ink">—</p>
        </div>
      </div>

      <Card>
        <Card.Header>
          <h2 className="text-lg font-medium text-ink">Recent Activity</h2>
        </Card.Header>
        <Card.Body>
          <div className="text-center py-12">
            <p className="text-ink-muted">No activity data available yet.</p>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
