import Link from "next/link";

// A white house with a tick on a brand-blue tile: a check that has been done.
// Decorative; the wordmark carries the name.
export const HOUSE_PATH = "M16 6.5 6.5 14.2V26h19V14.2z";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="#1d4ed8" />
      <path d={HOUSE_PATH} fill="#ffffff" />
      <path d="m11.6 18.6 3.2 3.2 5.8-6.2" fill="none" stroke="#1d4ed8" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Inherits its text colour, so it works on the light canvas and on the navy sidebar.
export function Logo({ href = "/", size = 30, className = "" }: { href?: string; size?: number; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 font-display text-lg font-extrabold tracking-[-0.02em] ${className}`}>
      <LogoMark size={size} />
      RentCert
    </Link>
  );
}
