import { createClient } from '@/lib/supabase/server';
import { getMonthlyFeedbackCount } from '@/lib/usage';
import { FREE_TIER_LIMIT } from '@/lib/permissions';

export async function UsageBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch subscription plan
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .single();

  if (sub?.plan !== 'free') {
    return null; // Pro users have unlimited usage, no need to show the bar
  }

  const usage = await getMonthlyFeedbackCount(user.id);
  const percentage = Math.min((usage / FREE_TIER_LIMIT) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="p-4 border-t border-border-subtle flex flex-col gap-2">
      <div className="flex justify-between items-center text-xs text-ink-subtle">
        <span className="font-medium">Free Tier Usage</span>
        <span>
          {usage} / {FREE_TIER_LIMIT}
        </span>
      </div>
      <div className="h-2 w-full bg-bg-secondary rounded-full overflow-hidden border border-border-subtle">
        <div
          className={`h-full rounded-full transition-all ${isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-blue-600'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isAtLimit && (
        <p className="text-[10px] text-red-500 font-medium">
          Limit reached. Widget paused.
        </p>
      )}
      {isNearLimit && !isAtLimit && (
        <p className="text-[10px] text-amber-600 font-medium">
          Approaching monthly limit.
        </p>
      )}
    </div>
  );
}
