import * as React from 'react';
import { Logo } from '@/components/ui/Logo';
import Link from 'next/link';

export function AuthLayout({
  children,
  imageDescription = 'A clean, minimalist 3D rendering of a modern feedback widget floating slightly above a sleek glass desk in a bright, sunlit modern office space.',
  imageUrl = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBnc1KcWRHc_vh3njxFfxhSVqcY6T6INUjt5gEcr7QFkhaBJSfUlVBG0f9TSONs_ar0hwQkNDiclnSessMjqoX-hSSljs0LZO0YT7-k9uwPUEEl1jzgdYy75z2txPQ2-g5QI54asiYEs8IEukwuguryupD6Ng95BhCUAZKSxVSb370cBVAZPAgnaye7ZXdx6lNYMNRD2WB862RRCl-fe-6dc5GweoxkwvgtnjUz-vwAYFVU_JAVGwwNjg',
}: {
  children: React.ReactNode;
  imageDescription?: string;
  imageUrl?: string;
}) {
  return (
    <div className="flex h-screen w-full bg-bg-primary font-sans text-ink antialiased overflow-hidden">
      {/* LEFT COLUMN */}
      <div className="w-full lg:w-[55%] h-full flex flex-col justify-between px-8 py-10 lg:px-16 lg:py-12 bg-bg-primary overflow-y-auto">
        {/* Branding */}
        <div className="flex items-center space-x-2">
          <Logo />
          <span className="text-lg font-bold tracking-tight text-ink">
            FeedbackFlow
          </span>
        </div>

        {/* Center Content */}
        <div className="w-full max-w-[460px] mx-auto flex flex-col justify-center flex-grow py-8">
          {children}
        </div>

        {/* Bottom spacer to balance top logo */}
        <div className="h-8"></div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="hidden lg:flex lg:w-[45%] h-full py-24 pr-24 pl-8 bg-bg-primary">
        {/* Framed Panel */}
        <div
          className="w-full h-full bg-bg-secondary rounded-lg flex items-center justify-center relative overflow-hidden bg-cover bg-center"
          style={{ backgroundImage: `url('${imageUrl}')` }}
          aria-label={imageDescription}
        >
          {/* Fallback text if image doesn't load/placeholder */}
          <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary/50 backdrop-blur-sm z-10">
            <span className="text-base text-ink-muted">Image placeholder</span>
          </div>
        </div>
      </div>
    </div>
  );
}
