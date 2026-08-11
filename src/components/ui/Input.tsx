import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-xs text-ink-muted mb-2">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={cn(
            'w-full px-[14px] py-[12px] bg-bg-primary text-sm text-ink placeholder:text-ink-muted',
            'border rounded-sm transition-all duration-150 focus:outline-none',
            error
              ? 'border-danger focus:border-danger focus:ring-3 focus:ring-danger/20'
              : 'border-border focus:border-accent focus:ring-3 focus:ring-accent-subtle',
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
