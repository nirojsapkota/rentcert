import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonClasses } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-5 text-sm font-semibold">
          <Link href="/#how-it-works" className="hidden text-ink-muted hover:text-ink md:inline">
            How it works
          </Link>
          <Link href="/pricing" className="hidden text-ink-muted hover:text-ink sm:inline">
            Pricing
          </Link>
          <Link href="/sign-in" className="whitespace-nowrap text-ink-muted hover:text-ink">
            Sign in
          </Link>
          <Link href="/sign-up" className={`${buttonClasses("primary")} whitespace-nowrap px-4`}>
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}
