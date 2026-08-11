import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      fill="none"
      height="24"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('', className)}
    >
      <rect fill="currentColor" height="16" rx="4" width="20" x="2" y="2" />
      <path d="M6 18V22L12 18H6Z" fill="currentColor" />
    </svg>
  );
}
