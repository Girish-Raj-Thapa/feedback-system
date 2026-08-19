'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { FormError } from '@/components/ui/FormError';
import {
  setupAccount,
  createOnboardingProject,
  pollFirstFeedback,
  getOnboardingState,
} from './actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Check,
  Copy,
  ChevronRight,
  Loader2,
  Globe,
  AlertCircle,
  CheckCircle2,
  XCircle,
  PartyPopper,
  ArrowRight,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5;
type Plan = 'free' | 'pro';

interface Project {
  id: string;
  public_key: string;
  website_url: string;
  widget_text: string;
}

interface VerifyResult {
  reachable: boolean;
  scriptFound: boolean;
  projectIdMatch: boolean;
  isLocalhost?: boolean;
  message?: string;
}

interface FirstFeedback {
  id: string;
  message: string;
  email?: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  page_url: string | null;
  created_at: string;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: Step }) {
  const totalSteps = 5;
  const progress = ((step - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="w-full max-w-md mx-auto mb-10">
      <div className="flex justify-between mb-2">
        <span className="text-xs text-ink-muted font-medium">
          Step {step} of {totalSteps}
        </span>
        <span className="text-xs text-ink-muted">
          {step === 1 && 'Choose plan'}
          {step === 2 && 'Create project'}
          {step === 3 && 'Install widget'}
          {step === 4 && 'Verify installation'}
          {step === 5 && 'First feedback'}
        </span>
      </div>
      <div className="h-1 bg-border-subtle rounded-full overflow-hidden">
        <div
          className="h-full bg-ink rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ─── Step 1: Plan Selection ───────────────────────────────────────────────────

function StepPlan({
  onNext,
  userId,
  email,
}: {
  onNext: (plan: Plan) => void;
  userId: string;
  email?: string;
}) {
  const [loading, setLoading] = useState<Plan | null>(null);
  const [error, setError] = useState('');
  const [paddle, setPaddle] = useState<any>(null);

  useEffect(() => {
    import('@paddle/paddle-js').then(({ initializePaddle }) => {
      initializePaddle({
        environment:
          (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as
            | 'sandbox'
            | 'production') || 'sandbox',
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
        eventCallback: (event) => {
          if (event.name === 'checkout.completed') {
            onNext('pro');
          }
        },
      })
        .then((paddleInstance) => {
          if (paddleInstance) {
            setPaddle(paddleInstance);
          }
        })
        .catch((err) => {
          console.error('Failed to initialize Paddle:', err);
        });
    });
  }, [onNext]);

  async function handleSelect(plan: Plan) {
    setLoading(plan);
    setError('');

    if (plan === 'pro') {
      if (!paddle) {
        setError('Billing system is initializing. Please try again in a moment.');
        setLoading(null);
        return;
      }
      
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
      // Do not unset loading, we wait for checkout.completed event
    } else {
      try {
        const res = await setupAccount(plan);
        if (res.success) {
          onNext(plan);
        } else {
          setError(res.error || 'Failed to set up account');
          setLoading(null);
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
        setLoading(null);
      }
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-ink tracking-tight mb-2">
          Choose your plan
        </h1>
        <p className="text-ink-muted text-sm">
          Start free. Upgrade anytime. You&apos;ll be set up in under 5 minutes.
        </p>
      </div>

      <FormError message={error} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
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
            {[
              'Up to 100 feedback submissions/mo',
              'Basic widget customization',
              '1 project limit',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-ink">
                <Check className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <Button
            variant="ink"
            className="w-full h-10 text-sm font-medium"
            loading={loading === 'free'}
            disabled={loading !== null}
            onClick={() => handleSelect('free')}
          >
            {loading === 'free' ? 'Setting up…' : 'Start free'}
          </Button>
        </div>

        {/* Pro Plan */}
        <div className="bg-ink rounded-xl p-6 shadow-lg text-bg-primary relative overflow-hidden flex flex-col ring-2 ring-ink/10">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

          <div className="mb-6">
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
            {[
              'Unlimited feedback submissions',
              'Advanced widget customization & themes',
              'Priority email & chat support',
              'Remove FeedbackFlow branding',
            ].map((f) => (
              <li
                key={f}
                className="flex items-start gap-2.5 text-bg-primary/90"
              >
                <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <Button
            variant="primary"
            className="w-full h-10 bg-bg-primary text-ink hover:bg-bg-primary/90 border-none text-sm font-medium"
            loading={loading === 'pro'}
            disabled={loading !== null || !paddle}
            onClick={() => handleSelect('pro')}
          >
            {loading === 'pro' ? 'Opening Checkout…' : 'Upgrade to Pro'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Create Project ───────────────────────────────────────────────────

function StepCreateProject({
  initialProject,
  onNext,
  onBack,
}: {
  initialProject?: Project | null;
  onNext: (project: Project) => void;
  onBack: () => void;
}) {
  const [websiteUrl, setWebsiteUrl] = useState(
    initialProject?.website_url || '',
  );
  const [widgetText, setWidgetText] = useState(
    initialProject?.widget_text || '',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!websiteUrl.trim()) {
      setError('Please enter your website URL');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await createOnboardingProject({
        websiteUrl: websiteUrl.trim(),
        widgetText: widgetText.trim() || 'Feedback',
      });

      if (res.success && res.project) {
        onNext(res.project as Project);
      } else {
        setError(res.error || 'Failed to create project');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="mb-4 text-sm text-ink-muted hover:text-ink transition-colors inline-flex items-center"
        >
          &larr; Back
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-ink tracking-tight mb-2">
            Create your feedback widget
          </h1>
          <p className="text-ink-muted text-sm">
            Just two things and your widget is ready.
          </p>
        </div>
      </div>

      <div className="bg-bg-primary border border-border-subtle rounded-xl p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormError message={error} />

          <div className="space-y-1.5">
            <label
              htmlFor="websiteUrl"
              className="block text-sm font-medium text-ink"
            >
              Your website URL
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                id="websiteUrl"
                type="text"
                placeholder="https://myapp.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                required
                autoFocus
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-border-subtle rounded-md bg-bg-primary text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="widgetText"
              className="block text-sm font-medium text-ink"
            >
              Button label{' '}
              <span className="text-ink-muted font-normal">(optional)</span>
            </label>
            <input
              id="widgetText"
              type="text"
              placeholder="Feedback"
              value={widgetText}
              onChange={(e) => setWidgetText(e.target.value)}
              maxLength={30}
              className="w-full px-4 py-2.5 text-sm border border-border-subtle rounded-md bg-bg-primary text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink transition-colors"
            />
            <p className="text-xs text-ink-muted">
              This is the text shown on the feedback button on your site.
            </p>
          </div>

          <Button
            type="submit"
            variant="ink"
            className="w-full h-10 text-sm font-medium flex items-center gap-2"
            loading={loading}
          >
            {!loading && (
              <>
                Create widget <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-ink-muted mt-5">
        You can customise colours, position, and theme in settings later.
      </p>
    </div>
  );
}

// ─── Step 3: Install Widget ─────────────────────────────────────────────────

const FRAMEWORKS = [
  { id: 'html', label: 'HTML' },
  { id: 'nextjs', label: 'Next.js' },
  { id: 'react', label: 'React' },
  { id: 'vue', label: 'Vue' },
  { id: 'nuxt', label: 'Nuxt' },
  { id: 'angular', label: 'Angular' },
  { id: 'wordpress', label: 'WordPress' },
  { id: 'webflow', label: 'Webflow' },
  { id: 'framer', label: 'Framer' },
];

// Reads from NEXT_PUBLIC_APP_URL so snippets always reference the right host:
//   local dev → http://localhost:3000/widget-v1.js
//   production → https://www.feedbackflow.app/widget-v1.js
const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL || 'https://www.feedbackflow.app'
).replace(/\/$/, '');

function getSnippet(framework: string, publicKey: string) {
  const src = `${APP_URL}/widget-v1.js`;
  const tag = `<script\n  src="${src}"\n  data-project="${publicKey}"\n></script>`;

  switch (framework) {
    case 'nextjs':
      return `// app/layout.tsx\nimport Script from 'next/script';\n\n<Script\n  src="${src}"\n  data-project="${publicKey}"\n  strategy="afterInteractive"\n/>`;
    case 'react':
      return `// In your index.html or root component:\n${tag}\n\n// Or via useEffect:\nuseEffect(() => {\n  const s = document.createElement('script');\n  s.src = '${src}';\n  s.setAttribute('data-project', '${publicKey}');\n  document.body.appendChild(s);\n}, []);`;
    case 'vue':
      return `<!-- public/index.html (Vue CLI) or index.html (Vite) -->\n${tag}`;
    case 'nuxt':
      return `// nuxt.config.ts\nexport default defineNuxtConfig({\n  app: {\n    head: {\n      script: [\n        { src: '${src}', 'data-project': '${publicKey}', defer: true }\n      ]\n    }\n  }\n})`;
    case 'angular':
      return `<!-- src/index.html (before closing </body>) -->\n${tag}`;
    case 'wordpress':
      return `// Add to your theme's functions.php:\nfunction add_feedbackflow() {\n  echo '<script src="${src}" data-project="${publicKey}"></script>';\n}\nadd_action('wp_footer', 'add_feedbackflow');`;
    case 'webflow':
      return `<!-- In Webflow: Site Settings → Custom Code → Footer Code -->\n${tag}`;
    case 'framer':
      return `// In Framer: Site Settings → General → Custom Code → End of <body>\n${tag}`;
    default:
      return `<!-- Paste before the closing </body> tag -->\n${tag}`;
  }
}

function StepInstall({
  project,
  onNext,
  onBack,
  onSkip,
}: {
  project: Project;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const [activeFramework, setActiveFramework] = useState('html');
  const [copied, setCopied] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  const snippet = getSnippet(activeFramework, project.public_key);

  function handleCopy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="mb-4 text-sm text-ink-muted hover:text-ink transition-colors inline-flex items-center"
        >
          &larr; Back
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-ink tracking-tight mb-2">
            Add FeedbackFlow to your website
          </h1>
          <p className="text-ink-muted text-sm">
            Copy and paste one snippet. That&apos;s it.
          </p>
        </div>
      </div>

      <div className="bg-bg-primary border border-border-subtle rounded-xl shadow-sm overflow-hidden">
        {/* Framework tabs */}
        <div className="flex gap-0 border-b border-border-subtle overflow-x-auto">
          {FRAMEWORKS.map((fw) => (
            <button
              key={fw.id}
              onClick={() => setActiveFramework(fw.id)}
              className={cn(
                'px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-[1px]',
                activeFramework === fw.id
                  ? 'border-ink text-ink bg-bg-secondary'
                  : 'border-transparent text-ink-muted hover:text-ink',
              )}
            >
              {fw.label}
            </button>
          ))}
        </div>

        {/* Code block */}
        <div className="relative">
          <pre className="p-5 text-xs font-mono text-ink bg-bg-secondary overflow-x-auto leading-relaxed">
            <code>{snippet}</code>
          </pre>
          <button
            onClick={handleCopy}
            className={cn(
              'absolute top-3 right-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-all',
              copied
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-bg-primary border border-border-subtle text-ink-muted hover:text-ink hover:border-border',
            )}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy code
              </>
            )}
          </button>
        </div>

        {/* Placement tip */}
        {activeFramework === 'html' && (
          <div className="px-5 py-3 bg-accent-subtle border-t border-border-subtle">
            <p className="text-xs text-accent font-medium">
              💡 Place this before the closing{' '}
              <code className="font-mono bg-white/60 px-1 rounded">
                &lt;/body&gt;
              </code>{' '}
              tag on every page.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-3">
        <Button
          variant="ink"
          className="w-full h-11 text-sm font-medium flex items-center gap-2"
          onClick={onNext}
        >
          I&apos;ve added the code <ChevronRight className="w-4 h-4" />
        </Button>
        <p className="text-center text-xs text-ink-muted">
          Not deployed yet?{' '}
          <button
            onClick={() => setShowSkipConfirm(true)}
            className="underline hover:text-ink"
          >
            Skip for now
          </button>
        </p>
      </div>

      <ConfirmDialog
        isOpen={showSkipConfirm}
        onClose={() => setShowSkipConfirm(false)}
        onConfirm={onSkip}
        title="Skip installation?"
        description="If you skip this step, you won't be able to collect feedback until you add the widget code to your website. Are you sure you want to skip?"
        confirmText="Skip anyway"
      />
    </div>
  );
}

// ─── Step 4: Verify Installation ─────────────────────────────────────────────

type CheckStatus = 'idle' | 'checking' | 'success' | 'failed';

interface CheckItem {
  label: string;
  key: keyof VerifyResult;
  successLabel: string;
  failLabel: string;
}

const CHECK_ITEMS: CheckItem[] = [
  {
    label: 'Reaching your website…',
    key: 'reachable',
    successLabel: 'Website is reachable',
    failLabel: 'Website not reachable',
  },
  {
    label: 'Detecting widget script…',
    key: 'scriptFound',
    successLabel: 'FeedbackFlow script detected',
    failLabel: 'Script not found on page',
  },
  {
    label: 'Verifying project ID…',
    key: 'projectIdMatch',
    successLabel: 'Project ID matches',
    failLabel: 'Project ID not found',
  },
];

function StepVerify({
  project,
  onNext,
  onSkip,
  onBack,
}: {
  project: Project;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const [status, setStatus] = useState<CheckStatus>('idle');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [visibleItems, setVisibleItems] = useState(0);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  async function handleCheck() {
    setStatus('checking');
    setResult(null);
    setVisibleItems(0);

    // Animate items appearing one by one
    for (let i = 0; i <= CHECK_ITEMS.length; i++) {
      await new Promise((r) => setTimeout(r, 600));
      setVisibleItems(i + 1);
    }

    try {
      const res = await fetch(
        `/api/projects/${project.id}/verify-installation`,
      );
      const data: VerifyResult = await res.json();
      setResult(data);

      if (data.isLocalhost) {
        setStatus('failed');
        return;
      }

      const allGood = data.reachable && data.scriptFound && data.projectIdMatch;
      setStatus(allGood ? 'success' : 'failed');
    } catch {
      setResult({
        reachable: false,
        scriptFound: false,
        projectIdMatch: false,
      });
      setStatus('failed');
    }
  }

  const allGood =
    result?.reachable && result?.scriptFound && result?.projectIdMatch;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="mb-4 text-sm text-ink-muted hover:text-ink transition-colors inline-flex items-center"
        >
          &larr; Back
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-ink tracking-tight mb-2">
            Verify your installation
          </h1>
          <p className="text-ink-muted text-sm">
            We&apos;ll check that the widget is live on{' '}
            <span className="text-ink font-medium break-all">
              {project.website_url}
            </span>
          </p>
        </div>
      </div>

      <div className="bg-bg-primary border border-border-subtle rounded-xl p-6 shadow-sm space-y-5">
        {/* Check items */}
        {status !== 'idle' && (
          <div className="space-y-3">
            {CHECK_ITEMS.map((item, idx) => {
              const visible = idx < visibleItems;
              const itemResult = result ? result[item.key] : null;
              const isChecking = visible && itemResult === null;

              return (
                <div
                  key={item.key}
                  className={cn(
                    'flex items-center gap-3 text-sm transition-all duration-300',
                    visible
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-2',
                  )}
                >
                  {isChecking ? (
                    <Loader2 className="w-4 h-4 text-ink-muted animate-spin shrink-0" />
                  ) : itemResult ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span
                    className={
                      itemResult === false ? 'text-rose-600' : 'text-ink'
                    }
                  >
                    {isChecking
                      ? item.label
                      : itemResult
                        ? item.successLabel
                        : item.failLabel}
                  </span>
                </div>
              );
            })}

            {/* Final status */}
            {result && (
              <div
                className={cn(
                  'pt-3 border-t border-border-subtle text-sm font-medium flex items-center gap-2',
                  allGood ? 'text-emerald-600' : 'text-rose-600',
                )}
              >
                {allGood ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    FeedbackFlow is installed! 🎉
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    {result.isLocalhost
                      ? 'Running locally — deploy to a public URL first'
                      : 'Could not confirm installation'}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Failure tips */}
        {status === 'failed' && result && !result.isLocalhost && (
          <div className="bg-bg-secondary rounded-lg p-4 text-xs text-ink-muted space-y-1.5">
            <p className="font-semibold text-ink text-sm">Common reasons:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>The code hasn&apos;t been deployed yet</li>
              <li>The script is only on some pages, not the homepage</li>
              <li>Your site has a caching layer — try a hard refresh first</li>
              <li>A Content Security Policy is blocking the script</li>
            </ul>
          </div>
        )}

        {/* CTA */}
        {status === 'idle' && (
          <Button
            id="check-installation-btn"
            variant="ink"
            className="w-full h-11 text-sm font-medium"
            onClick={handleCheck}
          >
            Check installation
          </Button>
        )}

        {status === 'checking' && (
          <Button
            variant="ink"
            className="w-full h-11 text-sm font-medium"
            disabled
          >
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Checking…
          </Button>
        )}

        {status === 'success' && (
          <Button
            variant="ink"
            className="w-full h-11 text-sm font-medium flex items-center gap-2"
            onClick={onNext}
          >
            Continue to next step <ChevronRight className="w-4 h-4" />
          </Button>
        )}

        {status === 'failed' && (
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1 h-10 text-sm"
              onClick={handleCheck}
            >
              Try again
            </Button>
            <Button
              variant="ink"
              className="flex-1 h-10 text-sm"
              onClick={onNext}
            >
              Continue anyway
            </Button>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-ink-muted mt-4">
        <button
          onClick={() => setShowSkipConfirm(true)}
          className="underline hover:text-ink"
        >
          Skip verification and go to dashboard
        </button>
      </p>

      <ConfirmDialog
        isOpen={showSkipConfirm}
        onClose={() => setShowSkipConfirm(false)}
        onConfirm={onSkip}
        title="Skip verification?"
        description="Are you sure you want to skip? Verifying your installation ensures that FeedbackFlow is working correctly on your site."
        confirmText="Skip anyway"
      />
    </div>
  );
}

// ─── Step 5: First Feedback ───────────────────────────────────────────────────

function StepFirstFeedback({
  project,
  onFinish,
}: {
  project: Project;
  onFinish: (projectId: string) => void;
}) {
  const [polling, setPolling] = useState(false);
  const [feedback, setFeedback] = useState<FirstFeedback | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const MAX_POLL_SECONDS = 120;

  // Generate a deterministic unique code for this user/project
  const uniqueCode = `TEST-${project.id.slice(0, 8).toUpperCase()}`;

  function handleCopyMessage() {
    navigator.clipboard.writeText(uniqueCode);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  }

  function handleCopyEmail() {
    navigator.clipboard.writeText('test@feedbackflow.app');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  }

  const startPolling = useCallback(() => {
    setPolling(true);
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);

    pollRef.current = setInterval(async () => {
      const result = await pollFirstFeedback(project.id, uniqueCode);
      if (result.hasData && result.feedback) {
        setFeedback(result.feedback);
        clearInterval(pollRef.current!);
        clearInterval(timerRef.current!);
        setPolling(false);
      }
    }, 3000);
  }, [project.id]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Stop polling after max duration
  useEffect(() => {
    if (elapsed >= MAX_POLL_SECONDS && polling) {
      clearInterval(pollRef.current!);
      clearInterval(timerRef.current!);
      setPolling(false);
    }
  }, [elapsed, polling]);

  if (feedback) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="mb-6">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight mb-2">
            Your first feedback!
          </h1>
          <p className="text-ink-muted text-sm">
            FeedbackFlow is working. Here&apos;s what came in:
          </p>
        </div>

        <div className="bg-bg-primary border border-border-subtle rounded-xl p-6 shadow-sm text-left mb-6">
          <p className="text-ink font-medium mb-3 leading-relaxed">
            &ldquo;{feedback.message}&rdquo;
          </p>
          {feedback.email && (
            <p className="text-sm text-ink-muted mb-4 font-mono">
              {feedback.email}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {feedback.browser && (
              <span className="inline-flex items-center px-2.5 py-1 bg-bg-secondary rounded-md text-xs text-ink-muted font-medium">
                {feedback.browser}
              </span>
            )}
            {feedback.device_type && (
              <span className="inline-flex items-center px-2.5 py-1 bg-bg-secondary rounded-md text-xs text-ink-muted font-medium capitalize">
                {feedback.device_type}
              </span>
            )}
            {feedback.page_url && (
              <span className="inline-flex items-center px-2.5 py-1 bg-bg-secondary rounded-md text-xs text-ink-muted font-medium truncate max-w-[200px]">
                {feedback.page_url}
              </span>
            )}
          </div>
        </div>

        <Button
          variant="ink"
          className="w-full h-11 text-sm font-medium flex items-center gap-2"
          onClick={() => onFinish(project.id)}
        >
          View your dashboard <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-ink tracking-tight mb-2">
          Send your first feedback
        </h1>
        <p className="text-ink-muted text-sm">
          Open your website, click the{' '}
          <span className="font-medium text-ink">
            {project.widget_text || 'Feedback'}
          </span>{' '}
          button, and submit the following test data.
        </p>
      </div>

      <div className="bg-bg-primary border border-border-subtle rounded-xl p-6 shadow-sm space-y-5">
        <div className="p-4 bg-bg-secondary rounded-lg border border-border-subtle text-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-ink-muted">Message:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono bg-bg-primary px-2 py-1 rounded text-ink border border-border-subtle shadow-sm select-all">
                {uniqueCode}
              </span>
              <button
                onClick={handleCopyMessage}
                title="Copy Message"
                className="p-1.5 text-ink-muted hover:text-ink hover:bg-bg-primary rounded border border-transparent hover:border-border-subtle transition-colors"
              >
                {copiedMessage ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-ink-muted">Email:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono bg-bg-primary px-2 py-1 rounded text-ink border border-border-subtle shadow-sm select-all">
                test@feedbackflow.app
              </span>
              <button
                onClick={handleCopyEmail}
                title="Copy Email"
                className="p-1.5 text-ink-muted hover:text-ink hover:bg-bg-primary rounded border border-transparent hover:border-border-subtle transition-colors"
              >
                {copiedEmail ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Polling UI */}
        <ol className="space-y-4">
          {[
            {
              num: 1,
              text: 'Open your website in a new tab',
              sub: project.website_url,
            },
            {
              num: 2,
              text: `Click the "${project.widget_text || 'Feedback'}" button`,
            },
            { num: 3, text: 'Submit the test message and email above' },
          ].map((step) => (
            <li key={step.num} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-ink text-white text-xs flex items-center justify-center font-semibold mt-0.5">
                {step.num}
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{step.text}</p>
                {step.sub && (
                  <a
                    href={step.sub}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:underline break-all"
                  >
                    {step.sub}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>

        {/* Polling UI */}
        {!polling ? (
          <Button
            id="start-polling-btn"
            variant="ink"
            className="w-full h-11 text-sm font-medium"
            onClick={startPolling}
          >
            I&apos;ve submitted feedback — show it to me!
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 py-3 px-4 bg-bg-secondary rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-ink-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink font-medium">
                  Waiting for feedback…
                </p>
                <p className="text-xs text-ink-muted">
                  {elapsed}s elapsed · checking every 3s
                </p>
              </div>
            </div>

            {/* progress bar */}
            <div className="h-1 bg-border-subtle rounded-full overflow-hidden">
              <div
                className="h-full bg-ink rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min((elapsed / MAX_POLL_SECONDS) * 100, 100)}%`,
                }}
              />
            </div>

            {elapsed >= MAX_POLL_SECONDS && (
              <p className="text-xs text-ink-muted text-center">
                Didn&apos;t detect feedback yet.{' '}
                <button
                  onClick={startPolling}
                  className="underline hover:text-ink"
                >
                  Try again
                </button>
              </p>
            )}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-ink-muted mt-4">
        <button
          onClick={() => setShowSkipConfirm(true)}
          className="underline hover:text-ink"
        >
          Skip and go to dashboard
        </button>
      </p>

      <ConfirmDialog
        isOpen={showSkipConfirm}
        onClose={() => setShowSkipConfirm(false)}
        onConfirm={() => onFinish(project.id)}
        title="Skip sending a test?"
        description="We highly recommend sending a test feedback to see how it looks in your dashboard. Are you sure you want to skip?"
        confirmText="Skip anyway"
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [project, setProject] = useState<Project | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [initializing, setInitializing] = useState(true);

  function updateStep(newStep: Step) {
    setStep(newStep);
    sessionStorage.setItem('onboardingStep', newStep.toString());
  }

  useEffect(() => {
    async function loadState() {
      const state = await getOnboardingState();
      let nextStep: Step = 1;

      if (state.success) {
        if (state.userId) setUserId(state.userId);
        if (state.email) setEmail(state.email);

        if (state.hasProject && state.project) {
          setProject(state.project as Project);
          nextStep = 3; // Minimum step if project exists
        } else if (state.hasSubscription) {
          nextStep = 2; // Minimum step if sub exists
        }
      }

      // Check if they were further along in this browser session
      const savedStepStr = sessionStorage.getItem('onboardingStep');
      if (savedStepStr) {
        const savedStep = parseInt(savedStepStr, 10) as Step;
        // Trust the saved step if it's equal or greater than the DB minimum
        // (but also allow them to be on step 2 explicitly if they went back)
        if (savedStep >= 1 && savedStep <= 5) {
          // Only allow overriding if it makes sense. If they have a project, they shouldn't be on step 1.
          if (state.hasProject && savedStep < 2) {
            nextStep = 3;
          } else {
            nextStep = savedStep;
          }
        }
      }

      setStep(nextStep);
      setInitializing(false);
    }
    loadState();
  }, []);

  function handlePlanNext() {
    updateStep(2);
  }

  function handleProjectNext(p: Project) {
    setProject(p);
    updateStep(3);
  }

  function handleInstallNext() {
    updateStep(4);
  }

  function handleVerifyNext() {
    updateStep(5);
  }

  function handleFinish(projectId: string) {
    sessionStorage.removeItem('onboardingStep');
    router.push(`/projects/${projectId}`);
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-bg-secondary flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-secondary flex flex-col items-center justify-start pt-12 px-4 pb-12">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2">
        <Logo className="w-6 h-6 text-ink" />
        <span className="text-base font-semibold text-ink tracking-tight">
          FeedbackFlow
        </span>
      </div>

      {/* Progress */}
      <ProgressBar step={step} />

      {/* Step content */}
      <div className="w-full max-w-2xl">
        {step === 1 && <StepPlan onNext={handlePlanNext} userId={userId} email={email} />}
        {step === 2 && (
          <StepCreateProject
            initialProject={project}
            onNext={handleProjectNext}
            onBack={() => updateStep(1)}
          />
        )}
        {step === 3 && project && (
          <StepInstall
            project={project}
            onNext={handleInstallNext}
            onBack={() => updateStep(2)}
            onSkip={() => router.push(`/projects/${project.id}`)}
          />
        )}
        {step === 4 && project && (
          <StepVerify
            project={project}
            onNext={handleVerifyNext}
            onSkip={() => router.push(`/projects/${project.id}`)}
            onBack={() => updateStep(3)}
          />
        )}
        {step === 5 && project && (
          <StepFirstFeedback project={project} onFinish={handleFinish} />
        )}
      </div>
    </div>
  );
}
