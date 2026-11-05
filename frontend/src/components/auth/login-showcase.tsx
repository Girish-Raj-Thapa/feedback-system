import Image from "next/image";

/**
 * Visual illustration showcasing the Voice of Customer Score Driver engine
 * for the Sign-In / Login page:
 * - Daniel Okafor's 5-star pull quote with highlighted Lift and Drag phrases
 * - Hand-drawn SVG connector curves pointing to live Lift and Drag chips
 * - Handwritten Caveat callout ("fix this one first")
 * - Background layered customer review from Priya ("Setup took ten minutes")
 * - Overall rating velocity summary pill
 */
export function LoginShowcase() {
  return (
    <aside
      aria-label="Customer feedback and speed insight illustration"
      className="relative flex h-[520px] xl:h-[550px] w-full max-w-[620px] items-center justify-center overflow-visible select-none"
    >
      {/* Priya side card (partly tucked behind main card at top right, rotated +2.5 deg) */}
      <div
        className="card-shadow-sub absolute -top-4 right-4 sm:right-8 z-0 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-sm rounded-[14px] px-4 py-3 border border-slate-100/80 dark:border-white/10 flex items-center gap-3 transform rotate-[2.5deg] transition-transform duration-300 hover:rotate-0 hover:z-30"
      >
        <Image
          src="/avatars/priya.jpg"
          alt="Priya"
          width={32}
          height={32}
          loading="lazy"
          className="size-8 rounded-full object-cover ring-1 ring-white/80"
        />
        <div>
          <div className="text-[13px] font-semibold text-slate-800 dark:text-white">
            Priya
          </div>
          <div className="text-[12.5px] text-slate-500 dark:text-slate-400">
            &ldquo;Setup took ten minutes&rdquo;
          </div>
        </div>
      </div>

      {/* Floating Chip ABOVE: Support response +0.5 ↑ (Top Left) */}
      <div
        className="chip-shadow absolute top-8 sm:top-10 left-4 sm:left-6 z-20 flex items-center gap-2 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800/40 transition-transform duration-200 hover:scale-105"
      >
        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
        <span className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-400 tracking-tight">
          Support response +0.5 ↑
        </span>
      </div>

      {/* SVG Connector Lines Overlay */}
      <svg
        className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
        viewBox="0 0 740 640"
        aria-hidden="true"
      >
        {/* Teal Connector: from "answered in minutes" upward to top-left chip */}
        <path
          d="M 235 275 C 200 210, 160 140, 120 72"
          fill="none"
          stroke="#0D9488"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeDasharray="3 0"
          opacity="0.85"
        />
        <path
          d="M 124 80 L 120 72 L 128 72"
          fill="none"
          stroke="#0D9488"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Magenta Connector: from "so slow to load" downward to bottom-left chip */}
        <path
          d="M 250 395 C 195 435, 165 455, 135 480"
          fill="none"
          stroke="#D92D73"
          strokeWidth="1.75"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Handwritten Arrow pointing left to the drag chip */}
        <path
          d="M 240 488 C 210 491, 195 491, 175 490"
          fill="none"
          stroke="#0071E3"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path
          d="M 183 485 L 175 490 L 183 495"
          fill="none"
          stroke="#0071E3"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Main Pull-Quote Card (Rotated -1.5 deg, Centered) */}
      <div
        className="card-shadow-main relative z-10 w-[94%] sm:w-[500px] xl:w-[530px] rounded-[20px] border border-slate-100 dark:border-white/10 bg-white dark:bg-[#1C1C1E] p-6 sm:p-8 transform -rotate-[1.5deg]"
      >
        {/* Card Header Row */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <Image
              src="/avatars/daniel.jpg"
              alt="Daniel Okafor"
              width={48}
              height={48}
              loading="lazy"
              className="size-12 rounded-full object-cover border border-slate-100 ring-2 ring-[#0071E3]/20"
            />
            <div>
              <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white leading-snug">
                Daniel Okafor
              </h3>
              <p className="text-[12.5px] text-slate-400 font-normal">
                Verified buyer
              </p>
            </div>
          </div>

          {/* 5-Star Rating (All solid Apple Blue stars) */}
          <div className="flex items-center gap-1" aria-label="Rated 5 out of 5 stars">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                className="size-[18px] fill-current text-[#0071E3] dark:text-[#2997FF]"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
          </div>
        </div>

        {/* Quote with highlighted phrases */}
        <blockquote className="text-[23px] sm:text-[25px] xl:text-[27px] font-[500] leading-[1.38] tracking-[-0.018em] text-slate-900 dark:text-white">
          &ldquo;Support{" "}
          <span className="highlight-teal text-[#0D746A] dark:text-[#4FD1C5]">
            answered in minutes
          </span>{" "}
          and fixed it on the spot. The only thing I wish is that the app wasn’t{" "}
          <span className="highlight-magenta text-[#BE1259] dark:text-[#F58BBE]">
            so slow to load
          </span>
          .&rdquo;
        </blockquote>
      </div>

      {/* Floating Chip BELOW: App speed −0.3 ↓ (Bottom Left) + Handwritten Note to its RIGHT */}
      <div className="absolute bottom-6 left-4 sm:left-6 z-20 flex items-center gap-3">
        {/* App speed drag chip */}
        <div
          className="chip-shadow flex items-center gap-1.5 rounded-full border border-rose-100 bg-white/95 px-3.5 py-1.5 backdrop-blur-md transition-transform duration-200 hover:scale-105 dark:border-rose-900/30 dark:bg-[#1C1C1E]/95"
        >
          <span className="size-2 rounded-full bg-rose-500" aria-hidden="true" />
          <span className="text-[13px] font-semibold text-rose-700 dark:text-rose-400 tracking-tight">
            App speed −0.3 ↓
          </span>
        </div>

        {/* Handwritten note in Caveat script font */}
        <div className="font-caveat text-[#0071E3] dark:text-[#2997FF] text-[22px] font-bold tracking-wide pt-0.5 pointer-events-none select-none">
          fix this one first
        </div>
      </div>

      {/* Rating Metric Pill (Anchored at bottom right of composition) */}
      <div className="chip-shadow absolute -bottom-2 right-4 z-20 flex items-center gap-2 rounded-full border border-slate-100 dark:border-white/10 bg-white/90 dark:bg-[#1C1C1E]/90 px-4 py-2 backdrop-blur-md text-[13px] text-slate-700 dark:text-slate-300">
        <span>Average rating</span>
        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
          4.5 <span className="text-[#0071E3] dark:text-[#2997FF]">★</span>
        </span>
        <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
          +0.3 this month
        </span>
      </div>
    </aside>
  );
}

