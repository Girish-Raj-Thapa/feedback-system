import Link from "next/link";

export function AuthFooter() {
  return (
    <footer className="flex w-full shrink-0 items-center justify-between border-t border-[#E2E8F0]/50 py-2.5 sm:py-3 lg:py-3.5 text-[11.5px] sm:text-[13px] text-[#94A3B8] dark:border-white/10">
      <div className="tracking-tight">
        © 2026 Feedback System
      </div>
      <div className="flex items-center gap-3 sm:gap-6">
        <Link href="#" className="hover:text-[#64748B] transition-colors">
          Privacy policy
        </Link>
        <Link href="#" className="hover:text-[#64748B] transition-colors">
          Terms of service
        </Link>
        <Link href="#" className="hover:text-[#64748B] transition-colors">
          Security
        </Link>
      </div>
    </footer>
  );
}
