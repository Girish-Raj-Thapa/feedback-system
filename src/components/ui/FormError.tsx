import React from 'react';

export function FormError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <div className="bg-red-50 text-red-600 border border-red-200 text-sm p-3 rounded-md flex items-start gap-2.5 mb-5 animate-in fade-in slide-in-from-top-1 duration-200">
      <svg
        className="w-5 h-5 shrink-0 text-red-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span className="font-medium pt-0.5">{message}</span>
    </div>
  );
}
