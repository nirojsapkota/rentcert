import Link from "next/link";

// A yellow service tag with a punched hole and a tick: a check that has been done.
// Decorative; the wordmark carries the name.
export const TAG_PATH = "M9 9.5 16 4l7 5.5V28H9z";
export const TAG_HOLE = "M16 7.6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d={`${TAG_PATH}${TAG_HOLE}`} fill="#f5c518" fillRule="evenodd" />
      <path d="m12.6 19.2 2.4 2.4 4.4-4.9" fill="none" stroke="#16191d" strokeWidth="2.2" strokeLinecap="square" />
    </svg>
  );
}

// Inherits its text colour, so it works on the light canvas and on the ink app bar.
export function Logo({ href = "/", size = 28, className = "" }: { href?: string; size?: number; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-1.5 font-display text-lg font-bold tracking-[-0.02em] ${className}`}>
      <LogoMark size={size} />
      RentCert
    </Link>
  );
}
