import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SubscriptionOverview } from '@/components/account/SubscriptionOverview';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch subscription info
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', user.id)
    .single();

  const plan = subscription?.plan || 'free';
  const status = subscription?.status || 'active';

  return (
    <div className="p-6 lg:p-9 max-w-4xl space-y-9">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight mb-1">
          Billing & Usage
        </h1>
        <p className="text-ink-muted">
          Manage your subscription and view your current plan details.
        </p>
      </div>

      <div className="space-y-6">
        {/* Subscription Info */}
        <SubscriptionOverview userId={user.id} email={user.email || ''} plan={plan} status={status} />

        {/* Future: Usage Meter can go here */}
      </div>
    </div>
  );
}
