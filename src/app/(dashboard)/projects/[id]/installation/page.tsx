'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Check,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Reads NEXT_PUBLIC_APP_URL so snippets match the current environment:
//   local dev → http://localhost:3000/widget-v1.js
//   production → https://www.feedbackflow.app/widget-v1.js
const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL || 'https://www.feedbackflow.app'
).replace(/\/$/, '');

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

function getSnippet(framework: string, publicKey: string) {
  const src = `${APP_URL}/widget-v1.js`;
  const tag = `<script\n  src="${src}"\n  data-project="${publicKey}"\n></script>`;

  switch (framework) {
    case 'nextjs':
      return `// app/layout.tsx\nimport Script from 'next/script';\n\n<Script\n  src="${src}"\n  data-project="${publicKey}"\n  strategy="afterInteractive"\n/>`;
    case 'react':
      return `// index.html:\n${tag}\n\n// Or dynamically via useEffect:\nuseEffect(() => {\n  const s = document.createElement('script');\n  s.src = '${src}';\n  s.setAttribute('data-project', '${publicKey}');\n  document.body.appendChild(s);\n}, []);`;
    case 'vue':
      return `<!-- public/index.html (Vue CLI) or index.html (Vite) -->\n${tag}`;
    case 'nuxt':
      return `// nuxt.config.ts\nexport default defineNuxtConfig({\n  app: {\n    head: {\n      script: [\n        { src: '${src}', 'data-project': '${publicKey}', defer: true }\n      ]\n    }\n  }\n})`;
    case 'angular':
      return `<!-- src/index.html (before closing </body>) -->\n${tag}`;
    case 'wordpress':
      return `// functions.php:\nfunction add_feedbackflow() {\n  echo '<script src="${src}" data-project="${publicKey}"></script>';\n}\nadd_action('wp_footer', 'add_feedbackflow');`;
    case 'webflow':
      return `<!-- Site Settings → Custom Code → Footer Code -->\n${tag}`;
    case 'framer':
      return `<!-- Site Settings → General → Custom Code → End of <body> -->\n${tag}`;
    default:
      return `<!-- Paste before the closing </body> tag -->\n${tag}`;
  }
}

type CheckStatus = 'idle' | 'checking' | 'success' | 'failed';

interface VerifyResult {
  reachable: boolean;
  scriptFound: boolean;
  projectIdMatch: boolean;
  isLocalhost?: boolean;
  message?: string;
}

const CHECK_ITEMS = [
  {
    key: 'reachable' as const,
    successLabel: 'Website is reachable',
    failLabel: 'Website not reachable',
  },
  {
    key: 'scriptFound' as const,
    successLabel: 'FeedbackFlow script detected',
    failLabel: 'Script not found on page',
  },
  {
    key: 'projectIdMatch' as const,
    successLabel: 'Project ID matches',
    failLabel: 'Project ID not found',
  },
];

export default function InstallGuidePage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [activeFramework, setActiveFramework] = useState('html');
  const [copied, setCopied] = useState(false);

  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle');
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [visibleItems, setVisibleItems] = useState(0);

  useEffect(() => {
    async function fetchProject() {
      if (!params?.id) return;
      try {
        const res = await fetch(`/api/projects/${params.id}`);
        if (res.ok) setProject(await res.json());
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [params?.id]);

  const snippet = project
    ? getSnippet(activeFramework, project.public_key)
    : '';

  function handleCopy() {
    if (!snippet) return;
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const handleCheck = useCallback(async () => {
    if (!params?.id) return;
    setCheckStatus('checking');
    setVerifyResult(null);
    setVisibleItems(0);

    for (let i = 0; i <= CHECK_ITEMS.length; i++) {
      await new Promise((r) => setTimeout(r, 600));
      setVisibleItems(i + 1);
    }

    try {
      const res = await fetch(`/api/projects/${params.id}/verify-installation`);
      const data: VerifyResult = await res.json();
      setVerifyResult(data);
      const allGood = data.reachable && data.scriptFound && data.projectIdMatch;
      setCheckStatus(allGood ? 'success' : 'failed');
    } catch {
      setVerifyResult({
        reachable: false,
        scriptFound: false,
        projectIdMatch: false,
      });
      setCheckStatus('failed');
    }
  }, [params?.id]);

  if (loading) {
    return (
      <div className="p-9 flex justify-center">
        <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) return null;

  const allGood =
    verifyResult?.reachable &&
    verifyResult?.scriptFound &&
    verifyResult?.projectIdMatch;

  return (
    <div className="p-6 lg:p-9 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight mb-1">
          Installation Guide
        </h1>
        <p className="text-ink-muted">
          Add FeedbackFlow to your website and verify it&apos;s working.
        </p>
      </div>

      {/* Step 1: Code snippet */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-ink text-white text-xs flex items-center justify-center font-semibold">
              1
            </span>
            <h2 className="text-base font-semibold text-ink">
              Copy your widget code
            </h2>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {/* Framework tabs */}
          <div className="flex border-b border-border-subtle overflow-x-auto">
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
        </Card.Body>
      </Card>

      {/* Step 2: Verify */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-ink text-white text-xs flex items-center justify-center font-semibold">
              2
            </span>
            <h2 className="text-base font-semibold text-ink">
              Verify your installation
            </h2>
          </div>
          <p className="text-sm text-ink-muted mt-1 ml-9">
            We&apos;ll check that the widget is live on{' '}
            <a
              href={project.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline inline-flex items-center gap-1"
            >
              {project.website_url}
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </Card.Header>
        <Card.Body className="space-y-4">
          {/* Checklist */}
          {checkStatus !== 'idle' && (
            <div className="space-y-3">
              {CHECK_ITEMS.map((item, idx) => {
                const visible = idx < visibleItems;
                const itemResult = verifyResult ? verifyResult[item.key] : null;
                const isChecking = visible && itemResult === null;

                return (
                  <div
                    key={item.key}
                    className={cn(
                      'flex items-center gap-3 text-sm transition-all duration-300',
                      visible ? 'opacity-100' : 'opacity-0',
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
                        ? `Checking…`
                        : itemResult
                          ? item.successLabel
                          : item.failLabel}
                    </span>
                  </div>
                );
              })}

              {verifyResult && (
                <div
                  className={cn(
                    'pt-3 border-t border-border-subtle text-sm font-medium flex items-center gap-2',
                    allGood ? 'text-emerald-600' : 'text-amber-600',
                  )}
                >
                  {allGood ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> FeedbackFlow is
                      installed and verified! 🎉
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      {verifyResult.isLocalhost
                        ? 'Running locally — deploy to a public URL first'
                        : 'Installation not confirmed yet'}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Failure tips */}
          {checkStatus === 'failed' &&
            verifyResult &&
            !verifyResult.isLocalhost && (
              <div className="bg-bg-secondary rounded-lg p-4 text-xs text-ink-muted space-y-2">
                <p className="font-semibold text-sm text-ink">
                  Common reasons:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>The code hasn&apos;t been deployed yet</li>
                  <li>The script is only on some pages, not the homepage</li>
                  <li>
                    Your site has a caching layer — try clearing the cache
                  </li>
                  <li>A Content Security Policy is blocking the script</li>
                </ul>
              </div>
            )}

          {/* CTA */}
          {checkStatus === 'idle' && (
            <Button
              id="verify-install-btn"
              variant="ink"
              className="h-10 text-sm font-medium"
              onClick={handleCheck}
            >
              Check installation
            </Button>
          )}
          {checkStatus === 'checking' && (
            <Button variant="ink" className="h-10 text-sm" disabled>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Checking…
            </Button>
          )}
          {(checkStatus === 'success' || checkStatus === 'failed') && (
            <Button
              variant="secondary"
              className="h-10 text-sm"
              onClick={handleCheck}
            >
              Check again
            </Button>
          )}
        </Card.Body>
      </Card>

      {/* Public Key reference */}
      <Card>
        <Card.Header>
          <h2 className="text-base font-semibold text-ink">Your project key</h2>
          <p className="text-sm text-ink-muted mt-1">
            This is embedded in the snippet above. Keep it somewhere safe.
          </p>
        </Card.Header>
        <Card.Body>
          <code className="block bg-bg-secondary border border-border-subtle rounded-md px-4 py-3 text-sm font-mono text-ink break-all">
            {project.public_key}
          </code>
        </Card.Body>
      </Card>
    </div>
  );
}
