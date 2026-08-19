import Link from 'next/link';
import { MessageSquare } from 'lucide-react';

export function MarketingFooter() {
  return (
    <footer className="w-full border-t bg-gray-50/50 py-12">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-gray-900 transition-opacity hover:opacity-80">
              <MessageSquare className="h-6 w-6 text-black" />
              <span>FeedbackFlow</span>
            </Link>
            <p className="mt-4 text-sm text-gray-500 max-w-xs">
              The frictionless micro-feedback tool for modern websites. Zero dependencies, zero bloat, maximum context.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">Product</h3>
            <ul className="space-y-3">
              <li><Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Log In</Link></li>
              <li><Link href="/signup" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Sign Up</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">Legal</h3>
            <ul className="space-y-3">
              {/* TODO(Phase G): These links must be implemented and live before public signups are allowed */}
              <li><Link href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Privacy Policy</Link></li>
              {/* TODO(Phase G): These links must be implemented and live before public signups are allowed */}
              <li><Link href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} FeedbackFlow. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
