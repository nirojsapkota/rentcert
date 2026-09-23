import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-ink-muted">
        <p>
          RentCert is a tracking and document-storage tool. It does not provide legal, electrical, gas,
          smoke alarm or other compliance advice. Confirm the requirements that apply to your property with
          a licensed provider or the official guidance for your state or territory.
        </p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <span>© {new Date().getFullYear()} RentCert</span>
          <Link href="/pricing" className="hover:underline">Pricing</Link>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <Link href="/terms" className="hover:underline">Terms</Link>
        </p>
      </div>
    </footer>
  );
}
