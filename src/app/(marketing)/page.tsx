import Link from "next/link";
import { Faq } from "@/components/marketing/faq";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { VisitBeacon } from "@/components/marketing/visit-beacon";
import { buttonClasses } from "@/components/ui/button";

// Wording follows PLAN.md section 61: no guarantees of compliance, no fines or approvals claimed.
const STEPS = [
  ["Add your property", "Enter the address and, if you know them, the dates of the last smoke alarm, electrical and gas checks."],
  ["See what's coming up", "RentCert calculates the next due dates from the dates you entered and shows them on one dashboard."],
  ["Store the certificate", "When a check is done, record it and upload the certificate or report. The next due date updates."],
  ["Get reminders", "RentCert emails you 30 and 7 days before a due date, on the day, and if it passes."],
] as const;

// Example rows for the hero illustration. Clearly sample data, not a real account.
const EXAMPLE = [
  { badge: "!", badgeClass: "bg-danger text-white", rowClass: "bg-danger-soft", title: "Electrical safety check", detail: "Overdue by 10 days · 12 Example St", detailClass: "text-danger" },
  { badge: "14", badgeClass: "bg-accent text-[#3d2600]", rowClass: "bg-warning-soft", title: "Smoke alarm check", detail: "Due in 14 days · 12 Example St", detailClass: "text-warning" },
  { badge: "✓", badgeClass: "bg-success text-white", rowClass: "bg-success-soft", title: "Gas safety check", detail: "Up to date · certificate stored", detailClass: "text-success" },
] as const;

function FeatureIcon({ path }: { path: string }) {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={path} />
      </svg>
    </span>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-24">
      <VisitBeacon />
      <section className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="inline-block rounded-full bg-accent-soft px-4 py-1.5 text-sm font-semibold text-accent-ink">
            For Australian landlords who self-manage
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] text-deep sm:text-6xl">Never miss a rental compliance deadline again.</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-muted">
            RentCert remembers when your smoke alarm, electrical and gas checks are due, keeps the certificates in one place,
            and emails you before each date.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-up" className={`${buttonClasses("primary")} px-7 py-3.5 text-base`}>
              Start free
            </Link>
            <a href="#how-it-works" className={`${buttonClasses("secondary")} px-7 py-3.5 text-base`}>
              See how it works
            </a>
          </div>
          <p className="mt-4 text-sm text-ink-muted">Free trial for 1 property. No card needed.</p>
        </div>

        <figure aria-label="Example of the RentCert dashboard">
          <div className="relative">
          <div aria-hidden="true" className="absolute inset-0 translate-x-4 translate-y-4 rounded-[2rem] bg-brand-soft sm:translate-x-8" />
          <div className="relative rounded-2xl border border-line bg-surface p-5 shadow-[0_30px_60px_-30px_rgba(13,59,58,0.35)] sm:p-6">
            <p className="font-display text-lg font-bold text-deep">Coming up</p>
            <ul className="mt-4 space-y-3">
              {EXAMPLE.map((row) => (
                <li key={row.title} className={`flex items-center gap-3 rounded-xl p-3 ${row.rowClass}`}>
                  <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${row.badgeClass}`}>
                    {row.badge}
                  </span>
                  <span>
                    <span className="block font-semibold">{row.title}</span>
                    <span className={`block text-sm ${row.detailClass}`}>{row.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-xl bg-deep p-4 text-white">
              <p className="text-xs font-semibold tracking-wide text-[#9fd1c2]">EMAIL REMINDER</p>
              <p className="mt-1 font-semibold">Smoke alarm check for 12 Example Street is due in 7 days</p>
            </div>
          </div>
          </div>
          <figcaption className="mt-8 text-sm text-ink-muted">Example data. Status is based on the dates you enter.</figcaption>
        </figure>
      </section>

      <section aria-labelledby="problem-heading" className="max-w-3xl">
        <h2 id="problem-heading" className="text-3xl font-bold text-deep">
          Compliance dates are easy to lose track of
        </h2>
        <p className="mt-3 text-lg text-ink-muted">
          Smoke alarm, electrical and gas checks come around every one or two years, often at different times for each
          property. The certificates end up in email threads and drawers. RentCert keeps your compliance records organised
          in one place.
        </p>
      </section>

      <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-8">
        <h2 id="how-heading" className="text-3xl font-bold text-deep">
          How it works
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, body], index) => (
            <li key={title} className="rounded-lg border border-line bg-surface p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft font-display font-bold text-accent-ink">
                <span className="sr-only">Step </span>
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-ink-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-7">
          <FeatureIcon path="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M9 14l2 2 4-4" />
          <h2 className="mt-4 text-xl font-bold">Certificate vault</h2>
          <p className="mt-2 text-ink-muted">
            Store certificates in one secure place. Files are private to your account, and you can download a Compliance
            Pack PDF for each property whenever you need one.
          </p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-7">
          <FeatureIcon path="M4 6h16v12H4zM4 7l8 6 8-6" />
          <h2 className="mt-4 text-xl font-bold">Reminder emails</h2>
          <p className="mt-2 text-ink-muted">
            Get reminders before the dates you&apos;ve entered, with a link straight to the property. Turn them off any time.
          </p>
        </div>
      </section>

      <section aria-labelledby="pricing-heading">
        <h2 id="pricing-heading" className="text-3xl font-bold text-deep">
          Pricing
        </h2>
        <div className="mt-8">
          <PricingCards />
        </div>
      </section>

      <Faq />

      <section aria-labelledby="disclaimer-heading" className="rounded-lg border border-line bg-surface p-6">
        <h2 id="disclaimer-heading" className="text-base font-bold">
          Important
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          RentCert is a tracking and document-storage tool. It does not perform inspections, issue certificates or provide
          legal, electrical, gas, smoke alarm or other compliance advice. Reminder dates are calculated from the dates you
          enter.
        </p>
      </section>

      <section className="rounded-[2rem] bg-deep px-6 py-14 text-center text-white">
        <h2 className="text-3xl font-bold">Keep your compliance records organised.</h2>
        <p className="mx-auto mt-3 max-w-xl text-[#c2dcd5]">Add your first property in a couple of minutes.</p>
        <Link href="/sign-up" className="mt-8 inline-flex items-center justify-center rounded-full bg-accent px-7 py-3.5 font-semibold text-[#3d2600] hover:bg-[#f0b55a]">
          Start free
        </Link>
      </section>
    </div>
  );
}
