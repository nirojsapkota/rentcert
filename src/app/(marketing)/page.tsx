import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { buttonClasses } from "@/components/ui/button";

// Placeholder landing page. The full marketing page arrives in Phase 8.
export default function HomePage() {
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-lg font-bold">RentCert</span>
          <Link href="/sign-in" className="text-sm font-medium text-brand hover:underline">
            Sign in
          </Link>
        </div>
      </header>
      <main className="min-w-0 mx-auto w-full max-w-5xl flex-1 px-4 py-16">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight">Never miss a rental compliance deadline again.</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-muted">
          RentCert helps self-managing Australian landlords track compliance dates, store certificates and get
          reminders before important deadlines.
        </p>
        <div className="mt-8">
          <Link href="/sign-up" className={buttonClasses("primary")}>
            Start free
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
