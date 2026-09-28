import Link from "next/link";

// House-and-tick mark: a home whose checks are done. Decorative; the wordmark carries the name.
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="10" fill="#0a5c5c" />
      <path d="M8 16.5L16 9l8 7.5V24a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z" fill="#f3f6f2" />
      <path d="M12.5 18.5l2.5 2.5 4.5-5" stroke="#e8a33d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/", size = 32 }: { href?: string; size?: number }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-brand">
      <LogoMark size={size} />
      RentCert
    </Link>
  );
}
