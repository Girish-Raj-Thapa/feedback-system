"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';

export function MarketingHeader() {
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-50% 0px -50% 0px', // Trigger when section is in the middle of the viewport
      }
    );

    const sections = ['features', 'how-it-works', 'pricing', 'faq'];
    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-gray-900 transition-opacity hover:opacity-80">
              <MessageSquare className="h-6 w-6 text-black" />
              <span>FeedbackFlow</span>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-1 p-1 bg-gray-50/50 rounded-full ring-1 ring-gray-900/5">
            <Link 
              href="#features" 
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${activeSection === 'features' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Features
            </Link>
            <Link 
              href="#how-it-works" 
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${activeSection === 'how-it-works' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5' : 'text-gray-600 hover:text-gray-900'}`}
            >
              How it works
            </Link>
            <Link 
              href="#pricing" 
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${activeSection === 'pricing' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Pricing
            </Link>
            <Link 
              href="#faq" 
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${activeSection === 'faq' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5' : 'text-gray-600 hover:text-gray-900'}`}
            >
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-9 items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50"
            >
              Start for free
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
