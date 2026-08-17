'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function WidgetPreviewPage() {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Read config from URL parameters
    const config = {
      position: searchParams.get('position') || 'bottom-right',
      color: searchParams.get('color') || '#000000',
      text: searchParams.get('text') || 'Feedback',
      theme: searchParams.get('theme') || 'light',
      border_radius: searchParams.get('border_radius') || '16px',
      icon: searchParams.get('icon') || 'chat',
      title: searchParams.get('title') || 'Send Feedback',
      open: true,
    };

    // Set the global override for widget-v1.js
    (window as any).FeedbackFlowConfigOverride = config;
    setReady(true);

    // Dynamically inject the widget script so React doesn't complain about <script> in JSX
    const scriptId = 'ff-preview-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = '/widget-v1.js';
      script.setAttribute('data-project', 'preview_key');
      script.defer = true;
      document.body.appendChild(script);
    }

    // Clean up function to remove the old widget UI when URL params change
    // so we don't get duplicate widgets
    return () => {
      const btn = document.getElementById('ff-btn');
      const panel = document.getElementById('ff-panel');
      if (btn) btn.remove();
      if (panel) panel.remove();
    };
  }, [searchParams]);

  if (!ready) return null;

  const isLeft = searchParams.get('position') === 'bottom-left';

  return (
    <div className="min-h-screen bg-transparent relative flex flex-col">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          /* Center the widget panel horizontally and vertically */
          #ff-panel {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            bottom: auto !important;
            right: auto !important;
            margin-left: -200px !important; 
            margin-top: -240px !important;  
          }
          
          /* Position the button directly below the panel */
          #ff-btn {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            bottom: auto !important;
            right: auto !important;
            /* Align with the panel's left or right edge */
            margin-left: ${isLeft ? '-200px' : '60px'} !important; 
            margin-top: 180px !important;  
            transform: none !important;
          }
        `,
        }}
      />
      <div className="w-full h-full min-h-[calc(100vh)] bg-bg-secondary flex items-center justify-center p-8">
        <div className="text-center text-ink-muted max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-bg-primary border border-border-subtle mx-auto mb-4 flex items-center justify-center text-ink">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h2 className="font-medium text-ink mb-2">Live Preview</h2>
          <p className="text-sm">
            The widget is rendered seamlessly in the center for previewing your
            customizations.
          </p>
        </div>
      </div>
    </div>
  );
}
