import Link from 'next/link';


export default function VerifySuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-secondary px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="bg-bg-primary border border-border-subtle rounded-xl p-10 sm:p-12 shadow-sm text-center">
          
          {/* Checkmark Icon */}
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
                strokeWidth="2.5"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
          </div>

          <h1 className="text-2xl font-semibold text-ink mb-4 tracking-tight">
            Email Verified!
          </h1>
          
          <p className="text-base text-ink-muted mb-10 leading-relaxed">
            Your account is verified and ready to go. Let's get your first project set up and choose the plan that works best for you.
          </p>

          <Link
            href="/onboarding"
            className="inline-flex w-full items-center justify-center rounded-sm bg-ink px-[22px] py-3 text-base font-medium text-white transition-colors duration-150 hover:opacity-90"
          >
            Continue to Onboarding
          </Link>
        </div>
      </div>
    </div>
  );
}
