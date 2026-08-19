'use client';

import { useState, useEffect } from 'react';
import { initializePaddle, Paddle } from '@paddle/paddle-js';
import { Button } from '@/components/ui/Button';

interface UpgradeButtonProps {
  userId: string;
  email?: string;
}

export function UpgradeButton({ userId, email }: UpgradeButtonProps) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializePaddle({
      environment: (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
    })
      .then((paddleInstance: Paddle | undefined) => {
        if (paddleInstance) {
          setPaddle(paddleInstance);
        }
      })
      .catch((err) => {
        console.error('Failed to initialize Paddle:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const openCheckout = () => {
    if (!paddle) return;

    paddle.Checkout.open({
      items: [
        {
          priceId: process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID!,
          quantity: 1,
        },
      ],
      customData: {
        user_id: userId,
      },
      customer: email ? { email } : undefined,
    });
  };

  return (
    <Button onClick={openCheckout} disabled={isLoading || !paddle}>
      {isLoading ? 'Loading Checkout...' : 'Upgrade to Pro'}
    </Button>
  );
}
