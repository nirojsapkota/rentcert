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

export default function HomePage() {
  return (
    <div className="space-y-20">
      <VisitBeacon />
      <section className="max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Never miss a rental compliance deadline again.</h1>
        <p className="mt-4 text-lg text-ink-muted">
          RentCert helps self-managing Australian landlords track compliance dates, store certificates and get reminders
          before important deadlines.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/sign-up" className={buttonClasses("primary")}>
            Start free
          </Link>
          <a href="#how-it-works" className={buttonClasses("secondary")}>
            See how it works
          </a>
        </div>
      </section>

      <section aria-labelledby="problem-heading" className="max-w-3xl space-y-3">
        <h2 id="problem-heading" className="text-2xl font-bold">
          Compliance dates are easy to lose track of
        </h2>
        <p className="text-ink-muted">
          Smoke alarm, electrical and gas checks come around every one or two years, often at different times for each
          property. The certificates end up in email threads and drawers. RentCert keeps your compliance records organised
          in one place.
        </p>
      </section>

      <section id="how-it-works" aria-labelledby="how-heading" className="space-y-6">
        <h2 id="how-heading" className="text-2xl font-bold">
          How it works
        </h2>
        <ol className="grid gap-4 md:grid-cols-4">
          {STEPS.map(([title, body], index) => (
            <li key={title} className="rounded-lg border border-line bg-surface p-5">
              <span className="text-sm font-semibold text-brand">Step {index + 1}</span>
              <h3 className="mt-1 font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="dashboard-heading" className="space-y-4">
        <h2 id="dashboard-heading" className="text-2xl font-bold">
          Your compliance overview at a glance
        </h2>
        <figure className="rounded-lg border border-line bg-surface p-5" aria-label="Example dashboard">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["3", "Properties"], ["1", "Overdue"], ["2", "Due soon"], ["6", "Up to date"]].map(([value, label]) => (
              <div key={label} className="rounded-md border border-line p-3">
                <span className="block text-2xl font-bold">{value}</span>
                <span className="text-sm text-ink-muted">{label}</span>
              </div>
            ))}
          </div>
          <figcaption className="mt-3 text-sm text-ink-muted">Example data. Status is based on the dates you enter.</figcaption>
        </figure>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-6">
          <h2 className="text-xl font-bold">Certificate vault</h2>
          <p className="mt-2 text-ink-muted">
            Store certificates in one secure place. Files are private to your account, and you can download a Compliance
            Pack PDF for each property whenever you need one.
          </p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-6">
          <h2 className="text-xl font-bold">Reminder emails</h2>
          <p className="mt-2 text-ink-muted">
            Get reminders before the dates you&apos;ve entered, with a link straight to the property. Turn them off any time.
          </p>
        </div>
      </section>

      <section aria-labelledby="pricing-heading" className="space-y-6">
        <h2 id="pricing-heading" className="text-2xl font-bold">
          Pricing
        </h2>
        <PricingCards />
      </section>

      <Faq />

      <section aria-labelledby="disclaimer-heading" className="rounded-lg border border-line bg-canvas p-6">
        <h2 id="disclaimer-heading" className="font-semibold">
          Important
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          RentCert is a tracking and document-storage tool. It does not perform inspections, issue certificates or provide
          legal, electrical, gas, smoke alarm or other compliance advice. Reminder dates are calculated from the dates you
          enter.
        </p>
      </section>

      <section className="text-center">
        <h2 className="text-2xl font-bold">Keep your compliance records organised.</h2>
        <Link href="/sign-up" className={`${buttonClasses("primary")} mt-6`}>
          Start free
        </Link>
      </section>
    </div>
  );
}
