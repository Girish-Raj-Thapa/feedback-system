import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { LayoutTemplate, Zap, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white selection:bg-gray-200">
      <MarketingHeader />
      
      <main className="flex-1">
        {/* 1. HERO SECTION */}
        <section className="relative overflow-hidden pt-24 pb-20 sm:pt-32 sm:pb-24">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-100 via-white to-white" />
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-gray-900 sm:text-7xl">
              Hear exactly what your users are <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-500 to-gray-900">thinking.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600 sm:text-xl">
              The frictionless, drop-in feedback widget built for indie SaaS founders and lean teams.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-x-6">
              <Link
                href="/signup"
                className="w-full sm:w-auto group inline-flex items-center justify-center rounded-full bg-black px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 hover:-translate-y-0.5 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
              >
                Start for free
              </Link>
              <Link href="#how-it-works" className="w-full sm:w-auto text-sm font-semibold leading-6 text-gray-900 hover:text-gray-600 transition-colors py-3.5">
                See how it works <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* 2. PRODUCT VISUAL */}
        <section className="relative pb-24 sm:pb-32">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-2xl bg-gray-50/50 p-2 sm:p-4 ring-1 ring-inset ring-gray-900/10 lg:rounded-3xl lg:p-8">
              {/* This represents a stylized dashboard and widget mockup without faking logos */}
              <div className="rounded-xl overflow-hidden bg-white shadow-2xl ring-1 ring-gray-900/5 flex flex-col md:flex-row">
                
                {/* Dashboard Side */}
                <div className="flex-1 p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-100 hidden sm:block">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="h-3 w-3 rounded-full bg-red-400"></div>
                    <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                    <div className="h-3 w-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="h-4 w-32 bg-gray-100 rounded mb-6"></div>
                  <div className="space-y-4">
                    <div className="h-16 w-full bg-gray-50 rounded-lg flex items-center px-4 gap-4">
                      <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-2 w-1/4 bg-gray-300 rounded"></div>
                        <div className="h-2 w-1/2 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                    <div className="h-16 w-full bg-gray-50 rounded-lg flex items-center px-4 gap-4">
                      <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-2 w-1/3 bg-gray-300 rounded"></div>
                        <div className="h-2 w-3/4 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Widget Preview Side */}
                <div className="flex-1 bg-gray-50 p-6 md:p-12 flex items-center justify-center relative min-h-[300px]">
                  <div className="absolute inset-0 pattern-dots pattern-gray-200 pattern-size-4 pattern-opacity-100"></div>
                  
                  {/* Floating Widget Mockup */}
                  <div className="relative z-10 w-72 bg-white rounded-xl shadow-xl ring-1 ring-gray-900/5 overflow-hidden flex flex-col transform transition-transform hover:-translate-y-1">
                    <div className="bg-black px-4 py-3 flex justify-between items-center">
                      <span className="text-white text-sm font-medium">Send Feedback</span>
                      <div className="h-4 w-4 text-gray-400">&times;</div>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="h-24 w-full bg-gray-50 rounded border border-gray-100 p-2">
                        <div className="h-2 w-2/3 bg-gray-200 rounded mb-2"></div>
                        <div className="h-2 w-1/2 bg-gray-200 rounded"></div>
                      </div>
                      <div className="h-8 w-full bg-black rounded text-white text-xs flex items-center justify-center font-medium">
                        Submit
                      </div>
                    </div>
                  </div>
                </div>
                
              </div>
            </div>
          </div>
        </section>

        {/* 3. BENEFITS (Reframed Features) */}
        <section id="features" className="py-24 sm:py-32 bg-gray-50">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <div className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-12 lg:max-w-none lg:grid-cols-3">
                <div className="flex flex-col bg-white rounded-3xl p-8 shadow-sm ring-1 ring-gray-900/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gray-800 to-black text-white shadow-md mb-6">
                    <LayoutTemplate className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold leading-8 text-gray-900">Won't break your site's styling.</h3>
                  <p className="mt-2 flex-auto text-base leading-7 text-gray-600">
                    Powered by impenetrable Shadow DOM isolation, guaranteeing our widget styles never clash with your CSS. What you build stays exactly how you built it.
                  </p>
                </div>
                
                <div className="flex flex-col bg-white rounded-3xl p-8 shadow-sm ring-1 ring-gray-900/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gray-800 to-black text-white shadow-md mb-6">
                    <Zap className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold leading-8 text-gray-900">Loads instantly, zero slowdowns.</h3>
                  <p className="mt-2 flex-auto text-base leading-7 text-gray-600">
                    A microscopic, zero-dependency vanilla JavaScript payload that won't impact your Core Web Vitals. Fast for your users, safe for your SEO.
                  </p>
                </div>
                
                <div className="flex flex-col bg-white rounded-3xl p-8 shadow-sm ring-1 ring-gray-900/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gray-800 to-black text-white shadow-md mb-6">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold leading-8 text-gray-900">Keeps your customers' data private.</h3>
                  <p className="mt-2 flex-auto text-base leading-7 text-gray-600">
                    Automatically strips sensitive query parameters and auth tokens from URLs before saving them to your dashboard, protecting your customers implicitly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. HOW IT WORKS */}
        <section id="how-it-works" className="py-24 sm:py-32 bg-white">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:mx-0">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Ready in 60 seconds
              </h2>
            </div>
            
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-3 lg:gap-x-8">
                <div className="relative flex flex-col bg-white rounded-3xl p-8 shadow-sm ring-1 ring-gray-900/5 hover:shadow-md transition-shadow">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-900 font-bold text-lg shadow-sm mb-6">
                    1
                  </div>
                  <h3 className="text-xl font-semibold leading-7 text-gray-900">Create your project.</h3>
                  <p className="mt-4 text-base leading-7 text-gray-600">
                    Customize your widget's colors and text to perfectly match your brand in our dashboard.
                  </p>
                </div>
                
                <div className="relative flex flex-col bg-white rounded-3xl p-8 shadow-sm ring-1 ring-gray-900/5 hover:shadow-md transition-shadow">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-900 font-bold text-lg shadow-sm mb-6">
                    2
                  </div>
                  <h3 className="text-xl font-semibold leading-7 text-gray-900">Paste one line of code.</h3>
                  <p className="mt-4 text-base leading-7 text-gray-600">
                    Copy the provided snippet into your website's header, and you're immediately live.
                  </p>
                </div>
                
                <div className="relative flex flex-col bg-white rounded-3xl p-8 shadow-sm ring-1 ring-gray-900/5 hover:shadow-md transition-shadow">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-900 font-bold text-lg shadow-sm mb-6">
                    3
                  </div>
                  <h3 className="text-xl font-semibold leading-7 text-gray-900">Read actionable feedback.</h3>
                  <p className="mt-4 text-base leading-7 text-gray-600">
                    View submissions in your dashboard, complete with the user's browser, screen size, and exact page URL.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. PRICING */}
        <section id="pricing" className="py-24 sm:py-32 bg-gray-50">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Simple, transparent pricing
              </h2>
            </div>
            <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-y-6 sm:mt-20 lg:max-w-4xl lg:grid-cols-2 lg:gap-x-8">
              
              {/* Free Tier */}
              <div className="flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-gray-200 xl:p-10">
                <div>
                  <h3 className="text-lg font-semibold leading-8 text-gray-900">Free</h3>
                  <p className="mt-4 text-sm leading-6 text-gray-600">Perfect for indie hackers and side projects just starting out.</p>
                  <p className="mt-6 flex items-baseline gap-x-1">
                    <span className="text-4xl font-bold tracking-tight text-gray-900">$0</span>
                    <span className="text-sm font-semibold leading-6 text-gray-600">/month</span>
                  </p>
                  <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                    <li className="flex gap-x-3"><CheckCircle2 className="h-6 w-5 flex-none text-black" /> 50 feedback submissions / month</li>
                    <li className="flex gap-x-3"><CheckCircle2 className="h-6 w-5 flex-none text-black" /> Unlimited projects</li>
                    <li className="flex gap-x-3"><CheckCircle2 className="h-6 w-5 flex-none text-black" /> 30-day data retention</li>
                  </ul>
                </div>
                <Link href="/signup" className="mt-8 block rounded-md bg-black px-3 py-2 text-center text-sm font-semibold leading-6 text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900">
                  Start for free
                </Link>
              </div>

              {/* Pro Tier */}
              <div className="flex flex-col justify-between rounded-3xl bg-gray-900 p-8 ring-1 ring-gray-900 xl:p-10">
                <div>
                  <h3 className="text-lg font-semibold leading-8 text-white">Pro</h3>
                  <p className="mt-4 text-sm leading-6 text-gray-300">For scaling teams that need unlimited context and retention.</p>
                  <p className="mt-6 flex items-baseline gap-x-1">
                    <span className="text-4xl font-bold tracking-tight text-white">Coming soon</span>
                  </p>
                  <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-300">
                    <li className="flex gap-x-3"><CheckCircle2 className="h-6 w-5 flex-none text-gray-400" /> Unlimited feedback submissions</li>
                    <li className="flex gap-x-3"><CheckCircle2 className="h-6 w-5 flex-none text-gray-400" /> Unlimited data retention</li>
                    <li className="flex gap-x-3"><CheckCircle2 className="h-6 w-5 flex-none text-gray-400" /> Custom webhook integrations</li>
                  </ul>
                </div>
                <div className="mt-8">
                  <p className="text-sm text-center text-gray-400 mb-3">Launching soon — join free today, upgrade seamlessly later.</p>
                  <Link href="/signup" className="block rounded-md bg-white/10 px-3 py-2 text-center text-sm font-semibold leading-6 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                    Create free account
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 6. FAQ */}
        <section id="faq" className="py-24 sm:py-32 bg-white">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Frequently asked questions
              </h2>
            </div>
            <div className="mx-auto mt-16 max-w-3xl space-y-4">
              <div className="bg-gray-50 rounded-3xl p-8 ring-1 ring-gray-900/5 hover:bg-gray-100/50 transition-colors">
                <dt className="text-lg font-semibold leading-7 text-gray-900">Does this require any coding to install?</dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Just copying and pasting one line of text into your website. It works with React, Webflow, WordPress, or plain HTML.
                </dd>
              </div>
              <div className="bg-gray-50 rounded-3xl p-8 ring-1 ring-gray-900/5 hover:bg-gray-100/50 transition-colors">
                <dt className="text-lg font-semibold leading-7 text-gray-900">Will it slow down my site?</dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  No. Our widget is written in zero-dependency vanilla JS. It's incredibly small and loads asynchronously.
                </dd>
              </div>
              <div className="bg-gray-50 rounded-3xl p-8 ring-1 ring-gray-900/5 hover:bg-gray-100/50 transition-colors">
                <dt className="text-lg font-semibold leading-7 text-gray-900">What happens when I hit the free limit (50 feedbacks)?</dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  We will send you an email alert when you reach 100% capacity. Any further feedback submissions that month will be securely rejected to prevent abuse, but your widget will remain visible.
                </dd>
              </div>
              <div className="bg-gray-50 rounded-3xl p-8 ring-1 ring-gray-900/5 hover:bg-gray-100/50 transition-colors">
                <dt className="text-lg font-semibold leading-7 text-gray-900">Can I export my data if I leave?</dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Absolutely. You can export all your feedback to CSV or PDF at any time. If you delete your account, all your data and projects are instantly and permanently erased.
                </dd>
              </div>
            </div>
          </div>
        </section>

        {/* 7. FINAL CTA */}
        <section className="bg-gray-900 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-gray-700 via-gray-900 to-black" />
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Start collecting actionable feedback in under 2 minutes.
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
                No credit card required.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-x-6">
                <Link
                  href="/signup"
                  className="w-full sm:w-auto rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Start for free
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
