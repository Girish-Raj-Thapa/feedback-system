'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { setupAccount } from './actions';
import { toast } from 'sonner';
import { Logo } from '@/components/ui/Logo';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const [loading, setLoading] = useState<'free' | 'pro' | null>(null);
  const router = useRouter();

  async function handleSelect(plan: 'free' | 'pro') {
    setLoading(plan);
    try {
      const res = await setupAccount(plan);
      if (res.success) {
        window.location.href = '/dashboard';
      } else {
        toast.error(res.error || 'Failed to setup account');
        setLoading(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred');
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-bg-secondary flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="mb-10 text-center max-w-xl w-full">
        <div className="flex justify-center mb-6">
          <Logo className="w-8 h-8 text-ink" />
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-ink tracking-tight mb-3">
          Choose a plan that fits your needs
        </h1>
        <p className="text-sm md:text-base text-ink-muted">
          Start for free, upgrade when you need more power. You can change your
          plan at any time.
        </p>
      </div>

      {/* Pricing Cards Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 max-w-3xl w-full">
        {/* Free Plan */}
        <div className="bg-bg-primary rounded-xl border border-border-subtle p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-ink mb-1.5">Free</h2>
            <p className="text-sm text-ink-muted mb-4">
              For personal and side projects.
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-ink">$0</span>
              <span className="text-sm text-ink-muted">/month</span>
            </div>
          </div>

          <ul className="space-y-3 mb-8 flex-1 text-sm">
            <li className="flex items-start gap-2.5 text-ink">
              <svg
                className="w-4 h-4 text-ink-muted shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>
                Up to <strong>100</strong> feedback submissions/mo
              </span>
            </li>
            <li className="flex items-start gap-2.5 text-ink">
              <svg
                className="w-4 h-4 text-ink-muted shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Basic widget customization</span>
            </li>
            <li className="flex items-start gap-2.5 text-ink">
              <svg
                className="w-4 h-4 text-ink-muted shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>1 project limit</span>
            </li>
          </ul>

          <Button
            variant="ink"
            className="w-full text-sm font-medium h-10"
            loading={loading === 'free'}
            disabled={loading !== null}
            onClick={() => handleSelect('free')}
          >
            Select Free
          </Button>
        </div>

        {/* Pro Plan */}
        <div className="bg-ink rounded-xl p-6 shadow-lg text-bg-primary relative overflow-hidden flex flex-col ring-2 ring-ink/10">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

          <div className="mb-6 relative">
            <div className="inline-block bg-white/10 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full mb-3">
              RECOMMENDED
            </div>
            <h2 className="text-xl font-semibold mb-1.5">Pro</h2>
            <p className="text-sm text-bg-primary/70 mb-4">
              For professional teams and SaaS.
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">$19</span>
              <span className="text-sm text-bg-primary/70">/month</span>
            </div>
          </div>

          <ul className="space-y-3 mb-8 flex-1 text-sm">
            <li className="flex items-start gap-2.5 text-bg-primary/90">
              <svg
                className="w-4 h-4 text-green-400 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>
                <strong>Unlimited</strong> feedback submissions
              </span>
            </li>
            <li className="flex items-start gap-2.5 text-bg-primary/90">
              <svg
                className="w-4 h-4 text-green-400 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Advanced widget customization & themes</span>
            </li>
            <li className="flex items-start gap-2.5 text-bg-primary/90">
              <svg
                className="w-4 h-4 text-green-400 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Priority email & chat support</span>
            </li>
            <li className="flex items-start gap-2.5 text-bg-primary/90">
              <svg
                className="w-4 h-4 text-green-400 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Remove FeedbackFlow branding</span>
            </li>
          </ul>

          <Button
            variant="primary"
            className="w-full h-10 bg-bg-primary text-ink hover:bg-bg-primary/90 border-none text-sm font-medium"
            loading={loading === 'pro'}
            disabled={loading !== null}
            onClick={() => handleSelect('pro')}
          >
            Upgrade to Pro
          </Button>
        </div>
      </div>
    </div>
  );
}
