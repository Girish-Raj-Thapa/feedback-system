import React, { useEffect } from 'react';
import { Button } from './Button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'ink';
  children?: React.ReactNode;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'ink',
  children,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-ink/20 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-bg-primary rounded-2xl shadow-xl border border-border-subtle p-6 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-ink-muted hover:text-ink transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-lg font-semibold text-ink mb-2 pr-6">{title}</h2>

        {description && (
          <p className="text-sm text-ink-muted mb-6 leading-relaxed">
            {description}
          </p>
        )}

        {children && <div className="mb-6">{children}</div>}

        <div className="flex items-center justify-end gap-3 mt-8">
          <Button
            variant="secondary"
            onClick={onClose}
            className="text-xs h-9 px-4"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="text-xs h-9 px-4"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
