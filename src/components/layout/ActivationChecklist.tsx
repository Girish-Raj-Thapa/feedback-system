import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  label: string;
  done: boolean;
  href?: string;
}

/**
 * Server Component — reads activation state from the DB on every render.
 * Disappears entirely once the user is fully activated.
 */
export async function ActivationChecklist({
  projectId,
}: {
  projectId: string;
}) {
  const supabase = await createClient();

  // Get project activation state
  const { data: project } = await supabase
    .from('projects')
    .select('id, installation_verified_at')
    .eq('id', projectId)
    .single();

  if (!project) return null;

  // Check if any real feedback exists
  const { count: feedbackCount } = await supabase
    .from('feedback')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  const hasProject = true; // We have the project
  const hasVerified = !!project.installation_verified_at;
  const hasFeedback = (feedbackCount ?? 0) > 0;

  const items: ChecklistItem[] = [
    { label: 'Create project', done: hasProject },
    {
      label: 'Install widget',
      done: hasVerified,
      href: hasVerified ? undefined : `/projects/${projectId}/install`,
    },
    {
      label: 'Verify installation',
      done: hasVerified,
      href: hasVerified ? undefined : `/projects/${projectId}/install`,
    },
    {
      label: 'Receive first feedback',
      done: hasFeedback,
      href: hasFeedback ? undefined : `/projects/${projectId}/install`,
    },
  ];

  const allDone = items.every((i) => i.done);

  // Don't render if fully activated
  if (allDone) return null;

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="mx-4 mb-4 rounded-lg border border-border-subtle bg-bg-secondary p-3">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-semibold text-ink">Get FeedbackFlow live</p>
        <span className="text-[10px] font-medium text-ink-muted">
          {doneCount}/{items.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-border rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-ink rounded-full transition-all duration-500"
          style={{ width: `${(doneCount / items.length) * 100}%` }}
        />
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label}>
            {item.href && !item.done ? (
              <Link
                href={item.href}
                className="flex items-center gap-2 text-xs text-accent hover:underline group"
              >
                <Circle className="w-3.5 h-3.5 shrink-0 text-border" />
                <span>{item.label}</span>
              </Link>
            ) : (
              <div
                className={cn(
                  'flex items-center gap-2 text-xs',
                  item.done ? 'text-ink-muted' : 'text-ink-muted',
                )}
              >
                {item.done ? (
                  <Check className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="w-3.5 h-3.5 shrink-0 text-border" />
                )}
                <span className={item.done ? 'line-through opacity-60' : ''}>
                  {item.label}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
