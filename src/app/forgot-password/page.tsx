'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setSuccess(false);
    setLoading(true);

    const supabase = createClient();

    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    toast.success('Reset link sent to your email!');
    setSuccess(true);
    setLoading(false);
  }

  return (
    <AuthLayout>
      <h1 className="text-xl font-semibold text-ink mb-3 tracking-tight">
        Reset your password
      </h1>
      <p className="text-base text-ink-muted mb-8">
        Enter your email address and we'll send you a link to reset your
        password.
      </p>

      {/* Card */}
      <div className="bg-bg-primary border border-border-subtle rounded-md p-8 shadow-sm">
        {success ? (
          <div className="text-center">
            <p className="text-base text-ink mb-6">
              Check your email for a link to reset your password. If it doesn't
              appear within a few minutes, check your spam folder.
            </p>
            <Link
              href="/login"
              className="text-sm font-medium text-accent hover:underline hover:text-accent-hover transition-colors"
            >
              Return to log in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-5">
            <FormError message={error} />

            <Input
              id="email"
              type="email"
              label="Email address"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />

            <Button
              type="submit"
              variant="ink"
              className="w-full"
              loading={loading}
            >
              Send reset link
            </Button>
          </form>
        )}

        {!success && (
          <div className="mt-6 text-center">
            <p className="text-sm text-ink-muted">
              Remember your password?{' '}
              <Link
                href="/login"
                className="text-accent hover:underline hover:text-accent-hover transition-colors"
              >
                Log in
              </Link>
            </p>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
