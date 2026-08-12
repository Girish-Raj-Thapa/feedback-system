export default function FeedbacksPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight mb-1">
          Inbox
        </h1>
        <p className="text-ink-muted">
          View and manage feedback from your users.
        </p>
      </div>

      <div className="bg-bg-primary border border-border-subtle rounded-xl p-12 text-center">
        <p className="text-ink-muted">You have no feedback yet.</p>
      </div>
    </div>
  );
}
