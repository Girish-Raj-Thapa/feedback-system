import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { UpgradeButton } from '@/components/billing/UpgradeButton';

interface SubscriptionOverviewProps {
  userId: string;
  plan: 'free' | 'pro';
  status: string;
}

export function SubscriptionOverview({ userId, plan, status }: SubscriptionOverviewProps) {
  const isPro = plan === 'pro';

  return (
    <Card className="p-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h3 className="text-lg font-medium text-ink mb-1 flex items-center gap-2">
            Current Plan
            <Badge variant={isPro ? 'success' : 'default'} className="uppercase text-xs">
              {plan}
            </Badge>
          </h3>
          <p className="text-sm text-ink-subtle mb-4">
            {isPro
              ? 'You are currently on the Pro plan with extended limits.'
              : 'You are currently on the Free plan. Upgrade to increase your feedback limits.'}
          </p>
          
          <div className="text-sm font-medium text-ink-subtle">
            Status: <span className="text-ink capitalize">{status}</span>
          </div>
        </div>

        <div className="flex gap-3">
          {/* Actions for Billing */}
          {isPro ? (
            <Button variant="secondary" disabled>
              Manage Subscription
            </Button>
          ) : (
            <UpgradeButton userId={userId} />
          )}
        </div>
      </div>
    </Card>
  );
}
