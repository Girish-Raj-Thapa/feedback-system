'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { FormError } from '@/components/ui/FormError';
import { Card } from '@/components/ui/Card';

export default function NewProjectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state defaults
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [widgetPosition, setWidgetPosition] = useState('bottom-right');
  const [widgetColor, setWidgetColor] = useState('#000000');
  const [widgetTheme, setWidgetTheme] = useState('light');
  const [widgetText, setWidgetText] = useState('Feedback');
  const [widgetBorderRadius, setWidgetBorderRadius] = useState('16px');
  const [widgetIcon, setWidgetIcon] = useState('chat');
  const [widgetTitle, setWidgetTitle] = useState('Send Feedback');

  // Debounce the iframe src
  const [debouncedPreviewUrl, setDebouncedPreviewUrl] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState<'general' | 'widget'>('general');

  useEffect(() => {
    const url = `/widget-preview?position=${widgetPosition}&color=${encodeURIComponent(widgetColor)}&theme=${widgetTheme}&text=${encodeURIComponent(widgetText)}&border_radius=${widgetBorderRadius}&icon=${widgetIcon}&title=${encodeURIComponent(widgetTitle)}`;
    const timer = setTimeout(() => {
      setDebouncedPreviewUrl(url);
    }, 150);
    return () => clearTimeout(timer);
  }, [widgetPosition, widgetColor, widgetTheme, widgetText, widgetBorderRadius, widgetIcon, widgetTitle]);

  async function handleSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
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
        throw new Error(data.error || 'Failed to create project');
      }

      const newProject = await res.json();
      toast.success('Project created successfully!');
      router.push(`/projects/${newProject.id}/settings`);
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="p-6 lg:p-9 max-w-7xl mx-auto space-y-9">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">
          Create New Project
        </h1>
        <p className="text-ink-muted">
          Set up your project details and customize your widget before generating your installation script.
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
                <h2 className="text-lg font-medium text-ink">General Information</h2>
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
                      Please include http:// or https:// (e.g., https://hello.com)
                    </p>
                  </div>
                </div>
              </Card.Body>
              <Card.Footer>
                <Button type="submit" variant="primary" loading={saving}>
                  Create Project
                </Button>
              </Card.Footer>
            </Card>

            {/* Installation Placeholder */}
            <Card className="self-start bg-bg-secondary border-dashed">
              <Card.Header>
                <h2 className="text-lg font-medium text-ink">Installation</h2>
              </Card.Header>
              <Card.Body>
                <p className="text-sm text-ink-muted">
                  Your installation script will be generated after you create the project.
                </p>
              </Card.Body>
            </Card>
          </div>
        )}

        {/* Widget Customization (2-Column Layout) */}
        {activeTab === 'widget' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-9">
            <Card className="lg:col-span-2 flex flex-col min-h-[500px]">
              <Card.Header className="py-4 shrink-0">
                <h2 className="text-sm font-medium text-ink">Design Settings</h2>
              </Card.Header>
              <Card.Body className="flex-1 overflow-y-auto min-h-0 space-y-6 p-6">
                <div>
                  <label className="block text-sm font-medium text-ink mb-3">Position</label>
                  <select
                    value={widgetPosition}
                    onChange={(e) => setWidgetPosition(e.target.value)}
                    className="w-full h-10 px-3 bg-bg-primary border border-border-subtle rounded-md text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent-subtle"
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-3">Theme</label>
                  <select
                    value={widgetTheme}
                    onChange={(e) => setWidgetTheme(e.target.value)}
                    className="w-full h-10 px-3 bg-bg-primary border border-border-subtle rounded-md text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent-subtle"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (OS Default)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-3">Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={widgetColor}
                      onChange={(e) => setWidgetColor(e.target.value)}
                      className="w-10 h-10 p-0 border-0 rounded cursor-pointer"
                    />
                    <Input
                      value={widgetColor}
                      onChange={(e) => setWidgetColor(e.target.value)}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-3">Border Radius</label>
                  <select
                    value={widgetBorderRadius}
                    onChange={(e) => setWidgetBorderRadius(e.target.value)}
                    className="w-full h-10 px-3 bg-bg-primary border border-border-subtle rounded-md text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent-subtle"
                  >
                    <option value="0px">Sharp (0px)</option>
                    <option value="4px">Slight (4px)</option>
                    <option value="8px">Medium (8px)</option>
                    <option value="16px">Rounded (16px)</option>
                    <option value="24px">Extra Rounded (24px)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-3">Trigger Icon</label>
                  <select
                    value={widgetIcon}
                    onChange={(e) => setWidgetIcon(e.target.value)}
                    className="w-full h-10 px-3 bg-bg-primary border border-border-subtle rounded-md text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent-subtle"
                  >
                    <option value="chat">Chat Bubble</option>
                    <option value="feedback">Feedback (Star)</option>
                    <option value="question">Question Mark</option>
                    <option value="bug">Bug Report</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-3">Trigger Button Text</label>
                  <Input
                    value={widgetText}
                    onChange={(e) => setWidgetText(e.target.value)}
                    placeholder="Feedback"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-3">Panel Title</label>
                  <Input
                    value={widgetTitle}
                    onChange={(e) => setWidgetTitle(e.target.value)}
                    placeholder="Send Feedback"
                  />
                </div>
              </Card.Body>
              <Card.Footer className="shrink-0 flex justify-end bg-bg-primary">
                <Button type="submit" variant="primary" loading={saving}>
                  Create Project
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
