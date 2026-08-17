'use client';

import React from 'react';
import Link from 'next/link';

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-secondary px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="bg-bg-primary border border-border-subtle rounded-xl p-10 sm:p-12 shadow-sm text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-accent-subtle">
            <svg
              className="h-10 w-10 text-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              ></path>
            </svg>
          </div>

          <h2 className="text-2xl font-semibold text-ink mb-4 tracking-tight">
            Check your email
          </h2>

          <p className="text-base text-ink-muted mb-6 leading-relaxed">
            We've sent a temporary login link to your email address. Please
            check your inbox and click the link to verify your account.
          </p>

          <p className="text-sm text-ink-muted mb-10">
            Can't find it? Check your spam folder or wait a minute before trying
            again.
          </p>

          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-sm bg-ink px-[22px] py-3 text-base font-medium text-white transition-colors duration-150 hover:opacity-90"
          >
            Return to log in
          </Link>
        </div>
      </div>
    </div>
  );
}
