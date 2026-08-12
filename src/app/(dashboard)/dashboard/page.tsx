export default function DashboardOverviewPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight mb-1">
          Dashboard
        </h1>
        <p className="text-ink-muted">
          Overview of your project's performance.
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

      <div className="bg-bg-primary border border-border-subtle rounded-xl p-12 text-center">
        <p className="text-ink-muted">No activity data available yet.</p>
      </div>
    </div>
  );
}
