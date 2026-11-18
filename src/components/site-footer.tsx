import Link from "next/link";
import { Info } from "lucide-react";
import { Logo } from "@/components/logo";

const LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Logo size={26} className="text-ink" />
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-ink-muted transition-colors hover:text-brand">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-6 flex gap-3 rounded-xl bg-canvas p-4">
          <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
            RentCert is a tracking and document-storage tool. It does not provide legal, electrical, gas,
            smoke alarm or other compliance advice. Confirm the requirements that apply to your property with
            a licensed provider or the official guidance for your state or territory.
          </p>
        </div>

        <p className="mt-6 border-t border-line pt-5 text-[0.8125rem] text-ink-muted">© {new Date().getFullYear()} RentCert</p>
      </div>
    </footer>
  );
}
