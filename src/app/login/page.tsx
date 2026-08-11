'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If we just came from a successful password reset, show the toast
    if (searchParams.get('reset') === 'success') {
      toast.success('Password updated successfully!', { duration: 15000 });

      // Clean up the URL so it doesn't persist if they refresh
      router.replace('/login');
    }
  }, [searchParams, router]);

  async function handleLogin(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setLoading(true);

    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setLoading(false);

    // Redirect to dashboard on successful login
    router.push('/dashboard');
  }

  return (
    <AuthLayout>
      <h1 className="text-xl font-semibold text-ink mb-3 tracking-tight">
        Welcome back to FeedbackFlow
      </h1>
      <p className="text-base text-ink-muted mb-8">
        Log in to continue to your dashboard.
      </p>

      {/* Card */}
      <div className="bg-bg-primary border border-border-subtle rounded-md p-8 shadow-sm">
        <form onSubmit={handleLogin} className="space-y-5">
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

          <div>
            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
            <div className="mt-2 text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-accent hover:underline hover:text-accent-hover transition-colors"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            variant="ink"
            className="w-full"
            loading={loading}
          >
            Log in
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-ink-muted">
            Don't have an account?{' '}
            <Link
              href="/signup"
              className="text-accent hover:underline hover:text-accent-hover transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
