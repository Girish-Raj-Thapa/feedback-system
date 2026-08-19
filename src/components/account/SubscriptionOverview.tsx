import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { UpgradeButton } from '@/components/billing/UpgradeButton';
import { ManageSubscriptionButton } from '@/components/billing/ManageSubscriptionButton';

interface SubscriptionOverviewProps {
  userId: string;
  email: string;
  plan: 'free' | 'pro';
  status: string;
}

export function SubscriptionOverview({ userId, email, plan, status }: SubscriptionOverviewProps) {
  const isPro = plan === 'pro';

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium text-ink mb-1 flex items-center gap-2">
            Current Plan: <span className="capitalize">{plan}</span>
            {isPro && (
              <Badge variant={status === 'active' ? 'success' : 'warning'}>
                {status}
              </Badge>
            )}
          </h3>
          <p className="text-sm text-ink-muted">
            {isPro
              ? 'You have access to all Pro features and unlimited feedback.'
              : 'You are currently on the Free plan with 50 submissions per month.'}
          </p>
        </div>

        <div className="flex gap-3">
          {/* Actions for Billing */}
          {isPro ? (
            <ManageSubscriptionButton />
          ) : (
            <UpgradeButton userId={userId} email={email} />
          )}
        </div>
      </div>
    </Card>
  );
}
