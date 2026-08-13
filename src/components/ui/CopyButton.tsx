'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CopyButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'p-2 rounded-md hover:bg-bg-secondary transition-colors text-ink-muted hover:text-ink',
        className
      )}
      aria-label="Copy to clipboard"
      title="Copy to clipboard"
    >
      {copied ? <Check size={16} strokeWidth={2} className="text-ink" /> : <Copy size={16} strokeWidth={2} />}
    </button>
  );
}
