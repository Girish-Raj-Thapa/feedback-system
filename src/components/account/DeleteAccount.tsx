'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormError } from '@/components/ui/FormError';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

export function DeleteAccount() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');

  const handleDelete = async () => {
    if (!password) {
      setError('Please enter your password to confirm deletion');
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      toast.success('Account successfully deleted');
      // The API already signed out the user on the server side,
      // redirecting to login will clear the client state automatically
      router.push('/login');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsDeleting(false);
      // Keep dialog open if there's an error so they can see it and retry
    }
  };

  return (
    <Card className="p-6 border-red-500/20 bg-red-500/5">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h3 className="text-lg font-medium text-red-600 mb-1">Delete Account</h3>
          <p className="text-sm text-ink-subtle max-w-xl">
            Permanently delete your account, projects, subscriptions, and all collected feedback. 
            This action cannot be undone.
          </p>
        </div>
        
        <Button 
          variant="secondary" 
          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 whitespace-nowrap"
          onClick={() => {
            setIsOpen(true);
            setError('');
            setPassword('');
          }}
          loading={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete Account'}
        </Button>
      </div>

      <ConfirmDialog
        isOpen={isOpen}
        onClose={() => {
          if (!isDeleting) setIsOpen(false);
        }}
        onConfirm={handleDelete}
        title="Delete Account"
        description="Are you absolutely sure you want to delete your account? All your projects, feedback, and settings will be permanently erased. This cannot be reversed."
        confirmText="Yes, delete my account"
        cancelText="Cancel"
      >
        <div className="space-y-3 mt-4">
          <label
            htmlFor="delete-password"
            className="block text-sm font-medium text-ink"
          >
            Confirm your password
          </label>
          <Input
            id="delete-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isDeleting}
            required
            placeholder="Enter your current password"
          />
          {error && <FormError message={error} />}
        </div>
      </ConfirmDialog>
    </Card>
  );
}
