'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export function ManageSubscriptionButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleManageClick = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/billing/portal');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate portal session');
      }

      if (data.url) {
        // Open the secure Paddle Customer Portal in a new tab
        window.open(data.url, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      toast.error(error.message || 'Unable to open Customer Portal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="secondary" 
      onClick={handleManageClick} 
      loading={isLoading}
      disabled={isLoading}
    >
      Manage Subscription
    </Button>
  );
}
