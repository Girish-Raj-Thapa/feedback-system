'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { FormError } from '@/components/ui/FormError';
import { Card } from '@/components/ui/Card';
import { CopyButton } from '@/components/ui/CopyButton';

export default function ProjectSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [project, setProject] = useState<any>(null);
  const params = useParams<{ id: string }>();

  // Form state
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [widgetPosition, setWidgetPosition] = useState('bottom-right');
  const [widgetColor, setWidgetColor] = useState('#000000');
  const [widgetTheme, setWidgetTheme] = useState('light');
  const [widgetText, setWidgetText] = useState('Feedback');
  const [widgetBorderRadius, setWidgetBorderRadius] = useState('16px');
  const [widgetIcon, setWidgetIcon] = useState('chat');
  const [widgetTitle, setWidgetTitle] = useState('Send Feedback');

  // Debounce the iframe src so the color picker doesn't crash the iframe
  const [debouncedPreviewUrl, setDebouncedPreviewUrl] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState<'general' | 'widget'>('general');

  useEffect(() => {
    const url = `/widget-preview?position=${widgetPosition}&color=${encodeURIComponent(widgetColor)}&theme=${widgetTheme}&text=${encodeURIComponent(widgetText)}&border_radius=${widgetBorderRadius}&icon=${widgetIcon}&title=${encodeURIComponent(widgetTitle)}&_t=${Date.now()}`;
    const timer = setTimeout(() => {
      setDebouncedPreviewUrl(url);
    }, 150); // 150ms debounce
    return () => clearTimeout(timer);
  }, [
    widgetPosition,
    widgetColor,
    widgetTheme,
    widgetText,
    widgetBorderRadius,
    widgetIcon,
    widgetTitle,
  ]);

  useEffect(() => {
    async function fetchProject() {
      if (!params?.id) return;
      try {
        const res = await fetch(`/api/projects/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data);
          setName(data.name || '');
          setWebsiteUrl(data.website_url || '');
          setWidgetPosition(data.widget_position || 'bottom-right');
          setWidgetColor(data.widget_color || '#000000');
          setWidgetTheme(data.widget_theme || 'light');
          setWidgetText(data.widget_text || 'Feedback');
          setWidgetBorderRadius(data.widget_border_radius || '16px');
          setWidgetIcon(data.widget_icon || 'chat');
          setWidgetTitle(data.widget_title || 'Send Feedback');
        }
      } catch (err) {
        console.error('Failed to fetch project');
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [params?.id]);

  async function handleSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/projects/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          website_url: websiteUrl,
          widget_position: widgetPosition,
          widget_color: widgetColor,
          widget_theme: widgetTheme,
          widget_text: widgetText,
          widget_border_radius: widgetBorderRadius,
          widget_icon: widgetIcon,
          widget_title: widgetTitle,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      toast.success('Project settings updated!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-9 flex justify-center">
        <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-9 max-w-7xl mx-auto space-y-9">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">
          Project
        </h1>
        <p className="text-ink-muted">
          Manage your project details and customize your feedback widget.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-border-subtle">
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-[1px] px-1 ${
            activeTab === 'general'
              ? 'border-ink text-ink'
              : 'border-transparent text-ink-muted hover:bg-bg-secondary hover:text-ink'
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab('widget')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-[1px] px-1 ${
            activeTab === 'widget'
              ? 'border-ink text-ink'
              : 'border-transparent text-ink-muted hover:bg-bg-secondary hover:text-ink'
          }`}
        >
          Widget Customization
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-9">
        <FormError message={error} />

        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-9">
            <Card className="self-start">
              <Card.Header>
                <h2 className="text-lg font-medium text-ink">
                  General Information
                </h2>
              </Card.Header>
              <Card.Body>
                <div className="space-y-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-ink mb-3"
                    >
                      Project Name
                    </label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="My Awesome App"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="websiteUrl"
                      className="block text-sm font-medium text-ink mb-3"
                    >
                      Website URL
                    </label>
                    <Input
                      id="websiteUrl"
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://example.com"
                      required
                    />
                    <p className="mt-1.5 text-xs text-ink-muted">
                      Please include http:// or https:// (e.g.,
                      https://hello.com)
                    </p>
                  </div>
                </div>
              </Card.Body>
              <Card.Footer>
                <Button type="submit" variant="primary" loading={saving}>
                  Save Changes
                </Button>
              </Card.Footer>
            </Card>

            {/* Installation Code */}
            {project && (
              <Card className="self-start">
                <Card.Header>
                  <h2 className="text-lg font-medium text-ink">Installation</h2>
                </Card.Header>
                <Card.Body>
                  <p className="text-sm text-ink-muted mb-6">
                    Copy and paste this code into the{' '}
                    <code className="bg-bg-secondary px-1 py-0.5 rounded text-ink border border-border-subtle">
                      &lt;head&gt;
                    </code>{' '}
                    of your website.
                  </p>
                  <div className="bg-bg-secondary border border-border-subtle p-4 rounded-md flex justify-between items-start gap-4">
                    <pre className="text-sm text-ink font-mono whitespace-pre-wrap break-all mt-1">
                      {`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget-v1.js" data-project="${project.public_key}"></script>`}
                    </pre>
                    <CopyButton
                      text={`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget-v1.js" data-project="${project.public_key}"></script>`}
                    />
                  </div>
                </Card.Body>
              </Card>
            )}
          </div>
        )}

        {/* Widget Customization (2-Column Layout) */}
        {activeTab === 'widget' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-9">
            <Card className="lg:col-span-2">
              <Card.Header>
                <h2 className="text-lg font-medium text-ink">
                  Design Settings
                </h2>
              </Card.Header>
              <Card.Body>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="widgetTheme"
                      className="block text-sm font-medium text-ink mb-3"
                    >
                      Theme
                    </label>
                    <select
                      id="widgetTheme"
                      value={widgetTheme}
                      onChange={(e) => setWidgetTheme(e.target.value)}
                      className="w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-ink outline-none focus:border-ink/20 focus:ring-4 focus:ring-ink/5"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto (OS Default)</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="widgetColor"
                      className="block text-sm font-medium text-ink mb-3"
                    >
                      Primary Color
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        id="widgetColor"
                        value={widgetColor}
                        onChange={(e) => setWidgetColor(e.target.value)}
                        className="h-10 w-12 rounded cursor-pointer border border-border-subtle p-0.5"
                      />
                      <Input
                        value={widgetColor}
                        onChange={(e) => setWidgetColor(e.target.value)}
                        className="flex-1 uppercase font-mono"
                        placeholder="#000000"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="widgetText"
                      className="block text-sm font-medium text-ink mb-3"
                    >
                      Button Text
                    </label>
                    <Input
                      id="widgetText"
                      value={widgetText}
                      onChange={(e) => setWidgetText(e.target.value)}
                      placeholder="Feedback"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="widgetIcon"
                      className="block text-sm font-medium text-ink mb-3"
                    >
                      Button Icon
                    </label>
                    <select
                      id="widgetIcon"
                      value={widgetIcon}
                      onChange={(e) => setWidgetIcon(e.target.value)}
                      className="w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-ink outline-none focus:border-ink/20 focus:ring-4 focus:ring-ink/5"
                    >
                      <option value="chat">Chat</option>
                      <option value="feedback">Feedback</option>
                      <option value="question">Question Mark</option>
                      <option value="bug">Bug</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="widgetPosition"
                      className="block text-sm font-medium text-ink mb-3"
                    >
                      Position
                    </label>
                    <select
                      id="widgetPosition"
                      value={widgetPosition}
                      onChange={(e) => setWidgetPosition(e.target.value)}
                      className="w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-ink outline-none focus:border-ink/20 focus:ring-4 focus:ring-ink/5"
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="widgetTitle"
                      className="block text-sm font-medium text-ink mb-3"
                    >
                      Panel Title
                    </label>
                    <Input
                      id="widgetTitle"
                      value={widgetTitle}
                      onChange={(e) => setWidgetTitle(e.target.value)}
                      placeholder="Send Feedback"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="widgetBorderRadius"
                      className="block text-sm font-medium text-ink mb-3"
                    >
                      Border Radius
                    </label>
                    <select
                      id="widgetBorderRadius"
                      value={widgetBorderRadius}
                      onChange={(e) => setWidgetBorderRadius(e.target.value)}
                      className="w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-ink outline-none focus:border-ink/20 focus:ring-4 focus:ring-ink/5"
                    >
                      <option value="0px">Square (0px)</option>
                      <option value="8px">Slight (8px)</option>
                      <option value="16px">Rounded (16px)</option>
                      <option value="24px">Very Rounded (24px)</option>
                    </select>
                  </div>
                </div>
              </Card.Body>
              <Card.Footer>
                <Button type="submit" variant="primary" loading={saving}>
                  Save Changes
                </Button>
              </Card.Footer>
            </Card>

            <Card className="lg:col-span-3">
              <Card.Header className="py-4">
                <h2 className="text-sm font-medium text-ink">Live Preview</h2>
              </Card.Header>
              <div className="flex-1 w-full flex items-center justify-center p-6 bg-bg-secondary h-full min-h-[500px]">
                <div className="w-[100%] h-full min-h-[400px] bg-bg-primary rounded-lg border border-border-subtle overflow-hidden relative shadow-sm">
                  {debouncedPreviewUrl && (
                    <iframe
                      src={debouncedPreviewUrl}
                      className="w-full h-full border-none"
                    />
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </form>
    </div>
  );
}
