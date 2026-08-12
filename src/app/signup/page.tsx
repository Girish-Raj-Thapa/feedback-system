'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setLoading(true);

    const supabase = createClient();

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    
    // Redirect to the dedicated check-email page
    router.push('/check-email');
  }

  return (
    <AuthLayout>
      <h1 className="text-xl font-semibold text-ink mb-3 tracking-tight">
        One widget. Every piece of feedback, in one place.
      </h1>
      <p className="text-base text-ink-muted mb-8">
        Hear what your users are telling you.
      </p>

      {/* Card */}
      <div className="bg-bg-primary border border-border-subtle rounded-md p-8 shadow-sm">
        <form onSubmit={handleSignup} className="space-y-5">
          <FormError message={error} />

          <Input
            id="fullName"
            type="text"
            label="Full name"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            autoComplete="name"
          />

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

          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="Create a password"
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
            Create account
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-ink-muted">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-accent hover:underline hover:text-accent-hover transition-colors"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>

      {/* Fine Print */}
      <div className="mt-8 text-center">
        <p className="text-xs text-ink-muted">
          By continuing, you agree to our{' '}
          <Link
            href="/privacy"
            className="text-accent underline hover:text-accent-hover transition-colors"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </AuthLayout>
  );
}
