'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenError, setTokenError] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Check if the URL contains the recovery parameters that come from the email link.
    // Supabase sends either a ?code=... (PKCE flow) or #access_token=...&type=recovery (Implicit flow)
    const hasRecoveryCode = window.location.search.includes('code=');
    const hasRecoveryHash = window.location.hash.includes('type=recovery');

    if (!hasRecoveryCode && !hasRecoveryHash) {
      // If there are no recovery parameters in the URL, they manually typed the address.
      // Kick them out immediately, even if they have an active regular session.
      router.replace('/login');
      return;
    }

    // If Supabase doesn't successfully validate the token within 3 seconds,
    // we assume it's expired or invalid.
    const verificationTimeout = setTimeout(() => {
      setTokenError(true);
    }, 3000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        clearTimeout(verificationTimeout);
        setIsVerifying(false);
      }
    });

    return () => {
      clearTimeout(verificationTimeout);
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleUpdatePassword(
    event: React.SyntheticEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError('');
    setLoading(true);

    const supabase = createClient();

    const { error: authError } = await supabase.auth.updateUser({
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Immediately sign the user out so they don't remain logged in
    await supabase.auth.signOut();

    // Redirect immediately to login, passing a query parameter to trigger the toast there
    router.push('/login?reset=success');
  }

  return (
    <AuthLayout>
      <h1 className="text-xl font-semibold text-ink mb-3 tracking-tight">
        Set new password
      </h1>
      <p className="text-base text-ink-muted mb-8">
        Please enter your new password below.
      </p>

      {/* Card */}
      <div className="bg-bg-primary border border-border-subtle rounded-md p-8 shadow-sm">
        {tokenError ? (
          <div className="text-center">
            <p className="text-base text-danger mb-6">
              This password reset link is invalid or has expired.
            </p>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-accent hover:underline hover:text-accent-hover transition-colors"
            >
              Request a new link
            </Link>
          </div>
        ) : isVerifying ? (
          <div className="text-center text-sm text-ink-muted py-8">
            Verifying secure link...
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <FormError message={error} />

            <Input
              id="password"
              type="password"
              label="New Password"
              placeholder="Create a new password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />

            <Button
              type="submit"
              variant="ink"
              className="w-full"
              loading={loading}
            >
              Update password
            </Button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
