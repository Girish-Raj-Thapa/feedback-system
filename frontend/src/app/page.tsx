"use client";

import { HeroProductMockup } from "@/components/landing/hero-product-mockup";
import { InteractiveWidgetDemo } from "@/components/landing/interactive-widget-demo";
import { LandingCta } from "@/components/landing/landing-cta";
import { LandingFeaturesBento } from "@/components/landing/landing-features-bento";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingStats } from "@/components/landing/landing-stats";

export default function RootHomePage() {
  return (
    <div className="min-h-screen bg-canvas text-text selection:bg-[#0071E3]/20 selection:text-[#0071E3] transition-colors duration-200">
      {/* Sticky Glassmorphic Header */}
      <LandingHeader />

      <main id="main-content">
        {/* Hero Section */}
        <div className="relative">
          <LandingHero />
          {/* Hero Product Browser Frame Mockup */}
          <div className="px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-10 mb-16">
            <HeroProductMockup />
          </div>
        </div>

        {/* Stats & Trust Bar */}
        <LandingStats />

        {/* Interactive Live Playground Section */}
        <section id="demo" className="py-24 sm:py-32 scroll-mt-16 relative">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center mb-12">
            <span className="text-[12px] font-bold uppercase tracking-wider text-action">
              Live Widget Playground
            </span>
            <h2 className="mt-2 text-[32px] sm:text-[44px] font-bold tracking-tight text-text leading-[1.15]">
              Try it right now. See how your customers experience it.
            </h2>
            <p className="mt-3 text-[15px] text-text-muted max-w-xl mx-auto">
              Switch rating scales, select category tags, and submit test feedback to
              experience the tailored outcome screen.
            </p>
          </div>

          <div className="px-4 sm:px-6 lg:px-8">
            <InteractiveWidgetDemo />
          </div>
        </section>

        {/* Features Bento Grid */}
        <LandingFeaturesBento />

        {/* How It Works (3 Steps) */}
        <LandingHowItWorks />

        {/* Conversion CTA Banner */}
        <LandingCta />
      </main>

      {/* Modern Footer */}
      <LandingFooter />
    </div>
  );
}
