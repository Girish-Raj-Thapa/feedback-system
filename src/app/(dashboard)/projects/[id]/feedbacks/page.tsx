'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import {
  Globe, Monitor, Smartphone, MonitorPlay,
  ChevronLeft, ChevronRight, Search,
  ArrowUpDown, ArrowUp, ArrowDown, Archive, Mail,
  CheckCircle2, Circle, X, Maximize
} from 'lucide-react';

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function FeedbacksPage() {
  const params = useParams<{ id: string }>();

  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState({ total: 0, open: 0, archived: 0 });

  // Table State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [meta, setMeta] = useState<{ totalCount: number, totalPages: number, hasMore: boolean } | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, open, archived

  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal State
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const fetchFeedbacks = useCallback(async () => {
    if (!params?.id) return;
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: debouncedSearch,
        status: statusFilter,
        sortBy,
        sortOrder
      });

      const res = await fetch(`/api/projects/${params.id}/feedbacks?${qs.toString()}`);
      if (!res.ok) throw new Error('Failed to load feedback');
      const { data, meta, analytics: apiAnalytics } = await res.json();

      setFeedbacks(data);
      setMeta(meta);
      setAnalytics(apiAnalytics);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [params?.id, page, limit, debouncedSearch, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc'); // Default to desc when switching columns
    }
    setPage(1);
  };

  const updateFeedbackStatus = async (feedbackId: string, newStatus: string) => {
    try {
      // Optimistic update
      setFeedbacks(current =>
        current.map(fb => fb.id === feedbackId ? { ...fb, status: newStatus } : fb)
      );

      const res = await fetch(`/api/projects/${params.id}/feedbacks/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Failed to update status');

      // Refresh to update analytics
      fetchFeedbacks();
    } catch (err) {
      console.error(err);
      // Revert optimistic update by refetching
      fetchFeedbacks();
    }
  };

  const DeviceIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <MonitorPlay className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ArrowUpDown className="w-3.5 h-3.5 text-ink-muted/40 ml-1" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-accent ml-1" />
      : <ArrowDown className="w-3.5 h-3.5 text-accent ml-1" />;
  };

  return (
    <div className="p-6 lg:p-9 max-w-[1400px] mx-auto space-y-9">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight mb-1">
          Feedback Inbox
        </h1>
        <p className="text-ink-muted">
          Read, search, and manage all feedback submitted through your widget.
        </p>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-primary border border-border-subtle rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-ink-muted mb-1">Total Feedback</h3>
          <p className="text-3xl font-bold text-ink">{analytics.total}</p>
        </div>
        <div className="bg-bg-primary border border-border-subtle rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-ink-muted mb-1">Open (Unresolved)</h3>
          <p className="text-3xl font-bold text-ink">{analytics.open}</p>
        </div>
        <div className="bg-bg-primary border border-border-subtle rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-ink-muted mb-1">Archived</h3>
          <p className="text-3xl font-bold text-ink">{analytics.archived}</p>
        </div>
      </div>

      <Card>
        {/* Toolbar */}
        <div className="p-4 border-b border-border-subtle flex flex-col sm:flex-row gap-4 items-center justify-between bg-bg-secondary/30">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input
              type="text"
              placeholder="Search message or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-bg-primary border border-border-subtle rounded-md text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent-subtle focus:border-accent transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-sm text-ink-muted font-medium whitespace-nowrap">Filter by Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40 px-3 py-2 bg-bg-primary border border-border-subtle rounded-md text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent-subtle focus:border-accent"
            >
              <option value="all">All Feedback</option>
              <option value="open">Open</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-secondary/50 border-b border-border-subtle text-xs font-medium text-ink-muted uppercase tracking-wider">
                <th className="px-6 py-4 cursor-pointer hover:bg-bg-secondary transition-colors" onClick={() => toggleSort('created_at')}>
                  <div className="flex items-center">Date <SortIcon column="created_at" /></div>
                </th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 cursor-pointer hover:bg-bg-secondary transition-colors" onClick={() => toggleSort('email')}>
                  <div className="flex items-center">User <SortIcon column="email" /></div>
                </th>
                <th className="px-6 py-4 max-w-[400px]">Message</th>
                <th className="px-6 py-4">Context</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading && feedbacks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-danger font-medium">{error}</td>
                </tr>
              ) : feedbacks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-ink-muted">
                    No feedback found matching your criteria.
                  </td>
                </tr>
              ) : (
                feedbacks.map((fb) => (
                  <tr
                    key={fb.id}
                    className="hover:bg-bg-secondary/30 transition-colors group cursor-pointer"
                    onClick={() => setSelectedFeedback(fb)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                      {timeAgo(fb.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize
                        ${fb.status === 'open' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}
                      `}>
                        {fb.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {fb.email ? (
                        <div className="flex items-center gap-2 text-ink">
                          <Mail className="w-4 h-4 text-ink-muted" />
                          {fb.email}
                        </div>
                      ) : (
                        <span className="text-ink-muted italic">Anonymous</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-ink max-w-[400px] truncate" title={fb.message}>
                      {fb.message}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-muted">
                      <div className="flex items-center gap-3">
                        {fb.device_type && (
                          <div className="flex items-center gap-1" title={`${fb.browser || 'Browser'} on ${fb.os || 'OS'}`}>
                            <DeviceIcon type={fb.device_type} />
                          </div>
                        )}
                        {fb.page_url && (
                          <div className="flex items-center gap-1" title={fb.page_url}>
                            <Globe className="w-4 h-4" />
                            <span className="truncate max-w-[100px]">
                              {(() => {
                                try { return new URL(fb.page_url).pathname; }
                                catch (e) { return fb.page_url; }
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm" onClick={(e) => e.stopPropagation()}>
                      {fb.status === 'open' ? (
                        <button
                          onClick={() => updateFeedbackStatus(fb.id, 'archived')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink hover:bg-border-subtle rounded-md transition-colors"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          Archive
                        </button>
                      ) : (
                        <button
                          onClick={() => updateFeedbackStatus(fb.id, 'open')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink hover:bg-border-subtle rounded-md transition-colors"
                        >
                          <Circle className="w-3.5 h-3.5" />
                          Re-open
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {meta && meta.totalPages > 1 && (
          <div className="p-4 border-t border-border-subtle flex items-center justify-between bg-bg-secondary/30">
            <span className="text-sm text-ink-muted">
              Showing page <span className="font-medium text-ink">{meta.page}</span> of <span className="font-medium text-ink">{meta.totalPages}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md text-ink bg-bg-primary border border-border-subtle hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!meta.hasMore}
                className="p-1.5 rounded-md text-ink bg-bg-primary border border-border-subtle hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Detailed Feedback Modal */}
      {selectedFeedback && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-ink/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
          onClick={() => setSelectedFeedback(null)}
        >
          <div
            className="bg-bg-primary w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Main Content: The Feedback Message */}
            <div className="flex-1 p-8 md:p-12 overflow-y-auto flex flex-col bg-bg-primary relative">
              <div className="absolute top-8 right-8 md:hidden">
                <button onClick={() => setSelectedFeedback(null)} className="p-2 text-ink-muted bg-bg-secondary rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 max-w-3xl">
                <div className="inline-flex items-center gap-2 mb-8">
                  <Mail className="w-5 h-5 text-accent" />
                  <span className="text-sm font-semibold text-accent uppercase tracking-widest">Feedback</span>
                </div>

                <p className="text-base sm:text-lg text-ink leading-relaxed whitespace-pre-wrap break-words">
                  {selectedFeedback.message}
                </p>
              </div>

              {/* Sender Footer inside main content */}
              <div className="mt-16 pt-8 border-t border-border-subtle">
                <div className="font-semibold text-ink text-xl">
                  {selectedFeedback.email || 'Anonymous User'}
                </div>
                <div className="text-sm font-medium text-ink-muted mt-0.5">
                  {new Date(selectedFeedback.created_at).toLocaleString(undefined, {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </div>
              </div>
            </div>

            {/* Right Sidebar: Context & Actions */}
            <div className="w-full md:w-[340px] bg-bg-secondary/40 p-8 border-t md:border-t-0 md:border-l border-border-subtle overflow-y-auto flex flex-col shrink-0">
              <div className="hidden md:flex justify-end mb-6">
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="p-2 -mr-2 -mt-2 text-ink-muted hover:text-ink hover:bg-border-subtle rounded-full transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-8">

                {/* Status Action */}
                <div>
                  <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3">Status</h4>
                  {selectedFeedback.status === 'open' ? (
                    <button
                      onClick={() => {
                        updateFeedbackStatus(selectedFeedback.id, 'archived');
                        setSelectedFeedback({ ...selectedFeedback, status: 'archived' });
                      }}
                      className="w-full py-3 px-4 bg-accent hover:bg-accent/90 text-white font-medium rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      <Archive className="w-5 h-5" />
                      Archive Feedback
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-full py-3 px-4 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 font-medium rounded-xl flex items-center justify-center gap-2 border border-green-200 dark:border-green-900/50">
                        <CheckCircle2 className="w-5 h-5" />
                        Archived
                      </div>
                      <button
                        onClick={() => {
                          updateFeedbackStatus(selectedFeedback.id, 'open');
                          setSelectedFeedback({ ...selectedFeedback, status: 'open' });
                        }}
                        className="w-full py-2 text-sm font-medium text-ink-muted hover:text-ink transition-colors"
                      >
                        Re-open feedback
                      </button>
                    </div>
                  )}
                </div>

                <hr className="border-border-subtle" />

                {/* Technical Context */}
                <div>
                  <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    System Context
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-bg-primary rounded-lg shadow-sm border border-border-subtle text-ink-muted">
                        <DeviceIcon type={selectedFeedback.device_type} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Device</div>
                        <div className="text-sm font-medium text-ink capitalize">{selectedFeedback.device_type || 'Unknown'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-bg-primary rounded-lg shadow-sm border border-border-subtle text-ink-muted">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Browser</div>
                        <div className="text-sm font-medium text-ink">{selectedFeedback.browser || 'Unknown'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-bg-primary rounded-lg shadow-sm border border-border-subtle text-ink-muted">
                        <MonitorPlay className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">OS</div>
                        <div className="text-sm font-medium text-ink">{selectedFeedback.os || 'Unknown'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-bg-primary rounded-lg shadow-sm border border-border-subtle text-ink-muted">
                        <Maximize className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Screen Size</div>
                        <div className="text-sm font-medium text-ink">
                          {selectedFeedback.screen_width && selectedFeedback.screen_height
                            ? `${selectedFeedback.screen_width}x${selectedFeedback.screen_height}`
                            : 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Page URL */}
                {selectedFeedback.page_url && (
                  <>
                    <hr className="border-border-subtle" />
                    <div>
                      <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3">Origin URL</h4>
                      <a
                        href={selectedFeedback.page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-bg-primary rounded-xl border border-border-subtle hover:border-accent hover:shadow-sm transition-all group"
                      >
                        <span className="text-sm font-medium text-ink break-all group-hover:text-accent transition-colors">
                          {selectedFeedback.page_url}
                        </span>
                      </a>
                    </div>
                  </>
                )}

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
