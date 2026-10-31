import Image from "next/image";

/**
 * Visual illustration showcasing the Voice of Customer Score Driver engine:
 * - Sarah Jenkins's 4-star pull quote with highlighted Lift and Drag phrases
 * - Hand-drawn SVG connector curves pointing to live Lift and Drag chips
 * - Handwritten Caveat callout ("this is what's costing you")
 * - Background layered customer reviews from Elena and Marcus
 * - Overall rating velocity summary pill
 */
export function ScoreDriverShowcase() {
  return (
    <aside
      aria-label="Customer feedback and score driver preview"
      className="relative flex h-[520px] xl:h-[550px] w-full max-w-[600px] items-center justify-center overflow-visible select-none"
    >
      {/* Layered Background Quote 1: Top Left (Elena, Angle: -2.8deg) */}
      <div
        className="card-shadow-sub absolute -top-1 left-2 sm:left-4 z-10 w-[270px] sm:w-[310px] rounded-[14px] border border-[#EEF2F6] bg-white/92 p-4 backdrop-blur-sm transition-transform duration-300 hover:rotate-0 hover:z-30 transform -rotate-[2.8deg] dark:border-white/10 dark:bg-[#1C1C1E]/92"
      >
        <div className="mb-2 flex items-center gap-2.5">
          <Image
            src="/avatars/elena.jpg"
            alt="Elena"
            width={28}
            height={28}
            loading="lazy"
            className="size-7 rounded-full object-cover ring-1 ring-white/80"
          />
          <span className="text-[13px] font-medium text-[#1E293B] dark:text-white">
            Elena
          </span>
        </div>
        <p className="text-[13.5px] leading-snug text-[#475569] dark:text-[#A1A1A6]">
          &ldquo;Search filters finally make sense&rdquo;
        </p>
      </div>

      {/* Layered Background Quote 2: Bottom Right (Marcus, Angle: -2deg) */}
      <div
        className="card-shadow-sub absolute bottom-1 right-2 sm:right-6 z-10 w-[270px] sm:w-[310px] rounded-[14px] border border-[#EEF2F6] bg-white/92 p-4 backdrop-blur-sm transition-transform duration-300 hover:rotate-0 hover:z-30 transform -rotate-[2deg] dark:border-white/10 dark:bg-[#1C1C1E]/92"
      >
        <div className="mb-2 flex items-center gap-2.5">
          <Image
            src="/avatars/marcus.jpg"
            alt="Marcus"
            width={28}
            height={28}
            loading="lazy"
            className="size-7 rounded-full object-cover ring-1 ring-white/80"
          />
          <span className="text-[13px] font-medium text-[#1E293B] dark:text-white">
            Marcus
          </span>
        </div>
        <p className="text-[13.5px] leading-snug text-[#475569] dark:text-[#A1A1A6]">
          &ldquo;Onboarding took literally 4 minutes&rdquo;
        </p>
      </div>

      {/* Main Pull-Quote Card (Sarah Jenkins, Rotated +1.5 deg, Centered) */}
      <div
        className="card-shadow-main relative z-20 w-[94%] sm:w-[500px] xl:w-[530px] rounded-[20px] border border-[#EAEFF6]/60 bg-white p-6 sm:p-8 transform rotate-[1.5deg] dark:border-white/10 dark:bg-[#1C1C1E]"
      >
        {/* Top row: Avatar + Name/Badge + 4-Star Rating (Apple blue stars) */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <Image
              src="/avatars/sarah.jpg"
              alt="Sarah Jenkins"
              width={44}
              height={44}
              loading="lazy"
              className="size-11 rounded-full object-cover ring-2 ring-[#0071E3]/20"
            />
            <div>
              <h3 className="text-[15.5px] font-semibold leading-tight text-[#0F172A] dark:text-white">
                Sarah Jenkins
              </h3>
              <span className="text-[12.5px] text-[#94A3B8]">
                Verified buyer
              </span>
            </div>
          </div>

          {/* 4-star rating: 4 solid Apple Blue stars, 1 empty star */}
          <div className="flex items-center gap-1" aria-label="Rated 4 out of 5 stars">
            {Array.from({ length: 4 }).map((_, i) => (
              <svg
                key={i}
                className="size-[18px] fill-current text-[#0071E3] dark:text-[#2997FF]"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
            <svg
              className="size-[18px] fill-current text-[#E2E8F0] dark:text-[#38383A]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
        </div>

        {/* Quote Text with Highlighter Marks */}
        <p className="text-[23px] sm:text-[25px] xl:text-[27px] font-[500] leading-[1.38] tracking-[-0.018em] text-[#111827] dark:text-white">
          &ldquo;Loved the new checkout,{" "}
          <span className="highlight-teal text-[#0D746A] dark:text-[#4FD1C5]">
            so much faster
          </span>
          . But my package arrived{" "}
          <span className="highlight-magenta text-[#BE1259] dark:text-[#F58BBE]">
            four days late
          </span>{" "}
          and nobody told me anything.&rdquo;
        </p>
      </div>

      {/* SVG Connector Layer for Hand-drawn Curved Lines */}
      <svg
        className="pointer-events-none absolute inset-0 z-25 h-full w-full overflow-visible"
        viewBox="0 0 680 610"
        aria-hidden="true"
      >
        {/* Line 1: Teal line curving up to the top right chip */}
        <path
          d="M 335 240 C 360 170, 440 135, 520 120"
          fill="none"
          stroke="#0D9488"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeDasharray="3 0"
          opacity="0.85"
        />
        <path
          d="M 514 125 L 522 120 L 519 111"
          fill="none"
          stroke="#0D9488"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Line 2: Magenta line curving down to the bottom right chip */}
        <path
          d="M 310 355 C 330 420, 390 475, 485 500"
          fill="none"
          stroke="#D92D73"
          strokeWidth="1.75"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M 477 495 L 487 500 L 481 508"
          fill="none"
          stroke="#D92D73"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Floating Chip 1: Top Right (Lift in Teal) */}
      <div
        className="chip-shadow absolute top-[70px] sm:top-[82px] right-[20px] sm:right-[42px] z-30 flex items-center gap-1.5 rounded-full border border-[#CCF0EB] bg-white/95 px-3.5 py-1.5 backdrop-blur-md transition-transform duration-200 hover:scale-105 dark:border-[#0D9488]/30 dark:bg-[#1C1C1E]/95"
      >
        <span className="size-2 rounded-full bg-[#0D9488] animate-pulse" aria-hidden="true" />
        <span className="text-[13px] font-semibold tracking-tight text-[#0D9488] dark:text-[#4FD1C5]">
          Checkout speed +0.4 ↑
        </span>
      </div>

      {/* Floating Chip 2: Bottom Right (Drag in Magenta) */}
      <div
        className="chip-shadow absolute bottom-[70px] sm:bottom-[80px] right-[25px] sm:right-[52px] z-30 flex items-center gap-1.5 rounded-full border border-[#FCD6E3] bg-white/95 px-3.5 py-1.5 backdrop-blur-md transition-transform duration-200 hover:scale-105 dark:border-[#D92D73]/30 dark:bg-[#1C1C1E]/95"
      >
        <span className="size-2 rounded-full bg-[#D92D73]" aria-hidden="true" />
        <span className="text-[13px] font-semibold tracking-tight text-[#D92D73] dark:text-[#F58BBE]">
          Shipping delays −0.5 ↓
        </span>
      </div>

      {/* Handwritten note in Caveat font */}
      <div className="pointer-events-none absolute bottom-[66px] left-[50px] sm:left-[130px] z-30 flex select-none items-center gap-2">
        <span className="font-[family-name:var(--font-caveat)] text-[22px] sm:text-[24px] font-bold tracking-wide text-[#0071E3] dark:text-[#2997FF] transform -rotate-[4deg]">
          this is what&apos;s costing you
        </span>
        <svg
          className="size-8 text-[#0071E3] dark:text-[#2997FF] transform rotate-[6deg]"
          viewBox="0 0 54 36"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M 4 16 C 18 10, 32 12, 48 20" />
          <path d="M 40 14 L 49 20 L 42 27" />
        </svg>
      </div>

      {/* Small white pill at very bottom right: Average Rating */}
      <div
        className="chip-shadow absolute -bottom-7 right-4 z-30 flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white/90 px-4 py-2 backdrop-blur-md dark:border-white/10 dark:bg-[#1C1C1E]/90"
      >
        <span className="text-[12.5px] font-medium text-[#475569] dark:text-[#A1A1A6]">
          Average rating
        </span>
        <span className="flex items-center gap-1 text-[13px] font-bold text-[#0F172A] dark:text-white">
          4.2 <span className="text-[#0071E3] dark:text-[#2997FF]">★</span>
        </span>
        <span className="rounded-full bg-[#E6F8F6] px-2 py-0.5 text-[12px] font-semibold text-[#0D9488] dark:bg-[#0D9488]/20 dark:text-[#4FD1C5]">
          +0.4 this month
        </span>
      </div>
    </aside>
  );
}

