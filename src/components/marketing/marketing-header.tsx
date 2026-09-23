import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="text-lg font-bold">
          RentCert
        </Link>
        <nav aria-label="Main" className="flex items-center gap-4 text-sm font-medium">
          <Link href="/pricing" className="text-ink-muted hover:text-ink">
            Pricing
          </Link>
          <Link href="/sign-in" className="text-ink-muted hover:text-ink">
            Sign in
          </Link>
          <Link href="/sign-up" className={`${buttonClasses("primary")} hidden sm:inline-flex`}>
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}
