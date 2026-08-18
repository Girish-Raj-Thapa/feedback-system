'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, Globe, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardOverviewPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalFeedback: 0,
    openFeedback: 0,
    resolvedFeedback: 0,
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        const [projectsRes, statsRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/dashboard/stats'),
        ]);

        if (projectsRes.ok) {
          const data = await projectsRes.json();
          setProjects(data);
        }
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="p-6 lg:p-9 max-w-7xl mx-auto space-y-9">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight mb-1">
            Dashboard
          </h1>
          <p className="text-ink-muted">
            Overview of your account and projects.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/projects/new')}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Create New Project
        </Button>
      </div>

      {/* Overall Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-primary border border-border-subtle rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-ink-muted mb-1">
            Total Projects
          </h3>
          <p className="text-3xl font-bold text-ink">
            {loading ? '-' : projects.length}
          </p>
        </div>
        <div className="bg-bg-primary border border-border-subtle rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-ink-muted mb-1">
            Total Feedback
          </h3>
          <p className="text-3xl font-bold text-ink">
            {loading ? '-' : stats.totalFeedback}
          </p>
        </div>
        <div className="bg-bg-primary border border-border-subtle rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-ink-muted mb-1">
            Resolved Feedback
          </h3>
          <p className="text-3xl font-bold text-ink">
            {loading ? '-' : stats.resolvedFeedback}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium text-ink">Your Projects</h2>

        {loading ? (
          <div className="text-ink-muted">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="bg-bg-primary border border-border-subtle rounded-xl p-12 text-center space-y-4">
            <div className="text-3xl">📭</div>
            <div className="space-y-2">
              <p className="text-base font-semibold text-ink">
                Your feedback inbox is ready.
              </p>
              <p className="text-sm text-ink-muted max-w-xs mx-auto">
                Once you install FeedbackFlow on your website, submissions will
                appear here.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="ink"
                onClick={() => router.push('/onboarding')}
                className="flex items-center gap-2"
              >
                Start setup
              </Button>
            </div>
            <p className="text-xs text-ink-muted pt-2">
              💡 Tip: Add FeedbackFlow to your most-visited page first.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:border-accent transition-colors cursor-pointer h-full flex flex-col group">
                  <Card.Body className="flex-1 space-y-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-ink text-lg">
                        {project.name}
                      </h3>
                      <div className="p-2 bg-bg-secondary rounded-md text-ink-muted group-hover:text-accent transition-colors">
                        <Settings size={18} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-ink-muted">
                      <Globe size={14} />
                      <span className="truncate">{project.website_url}</span>
                    </div>
                  </Card.Body>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
