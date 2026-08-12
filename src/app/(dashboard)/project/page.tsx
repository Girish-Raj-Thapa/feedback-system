'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { FormError } from '@/components/ui/FormError';

export default function ProjectSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [project, setProject] = useState<any>(null);

  // Form state
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [widgetPosition, setWidgetPosition] = useState('bottom-right');
  const [widgetColor, setWidgetColor] = useState('#000000');
  const [widgetTheme, setWidgetTheme] = useState('light');
  const [widgetText, setWidgetText] = useState('Feedback');

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch('/api/project');
        if (res.ok) {
          const data = await res.json();
          setProject(data);
          setName(data.name || '');
          setWebsiteUrl(data.website_url || '');
          setWidgetPosition(data.widget_position || 'bottom-right');
          setWidgetColor(data.widget_color || '#000000');
          setWidgetTheme(data.widget_theme || 'light');
          setWidgetText(data.widget_text || 'Feedback');
        }
      } catch (err) {
        console.error('Failed to fetch project');
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, []);

  async function handleSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/project', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          website_url: websiteUrl,
          widget_position: widgetPosition,
          widget_color: widgetColor,
          widget_theme: widgetTheme,
          widget_text: widgetText,
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
      <div className="p-8 flex justify-center">
        <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight mb-1">
          Project Settings
        </h1>
        <p className="text-ink-muted">
          Manage your project details and customize your feedback widget.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <FormError message={error} />

        {/* General Settings */}
        <div className="bg-bg-primary rounded-xl border border-border-subtle p-6 space-y-6">
          <h2 className="text-lg font-medium text-ink">General</h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-ink mb-1"
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
                className="block text-sm font-medium text-ink mb-1"
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
            </div>
          </div>
        </div>

        {/* Widget Customization */}
        <div className="bg-bg-primary rounded-xl border border-border-subtle p-6 space-y-6">
          <h2 className="text-lg font-medium text-ink">Widget Customization</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="widgetText"
                className="block text-sm font-medium text-ink mb-1"
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
                htmlFor="widgetColor"
                className="block text-sm font-medium text-ink mb-1"
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
                htmlFor="widgetPosition"
                className="block text-sm font-medium text-ink mb-1"
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
                htmlFor="widgetTheme"
                className="block text-sm font-medium text-ink mb-1"
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
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={saving}>
            Save Changes
          </Button>
        </div>
      </form>

      {/* Installation Code */}
      {project && (
        <div className="bg-ink rounded-xl p-6 text-bg-primary mt-12">
          <h2 className="text-lg font-medium mb-2">Installation</h2>
          <p className="text-sm text-bg-primary/70 mb-4">
            Copy and paste this code into the{' '}
            <code className="bg-bg-primary/20 px-1 py-0.5 rounded">
              &lt;head&gt;
            </code>{' '}
            of your website.
          </p>
          <div className="bg-black/50 p-4 rounded-lg overflow-x-auto relative group">
            <pre className="text-sm text-green-400 font-mono">
              {`<script src="https://yourdomain.com/widget.js" data-project="${project.public_key}"></script>`}
            </pre>
            <button
              className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium"
              onClick={() => {
                navigator.clipboard.writeText(
                  `<script src="https://yourdomain.com/widget.js" data-project="${project.public_key}"></script>`,
                );
                toast.success('Copied to clipboard!');
              }}
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
