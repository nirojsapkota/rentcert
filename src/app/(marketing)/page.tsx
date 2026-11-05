import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { Faq } from "@/components/marketing/faq";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { VisitBeacon } from "@/components/marketing/visit-beacon";
import { buttonClasses } from "@/components/ui/button";
// Captured from the seeded demo account by `npm run screens`. Re-run it when the dashboard changes.
import dashboardShot from "../../../public/screens/dashboard.png";

// Wording follows PLAN.md section 61: no guarantees of compliance, no fines or approvals claimed.
const STEPS = [
  ["Add your property", "Enter the address and, if you know them, the dates of the last smoke alarm, electrical and gas checks."],
  ["See what's coming up", "RentCert calculates the next due dates from the dates you entered and shows them on one dashboard."],
  ["Store the certificate", "When a check is done, record it and upload the certificate or report. The next due date updates."],
  ["Get reminders", "RentCert emails you 30 and 7 days before a due date, on the day, and if it passes."],
] as const;

// Eyebrow label: mono, uppercase, muted. Marks a section without another pill or chip.
function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-xs font-medium tracking-[0.08em] text-ink-muted uppercase">{children}</p>;
}

export default function HomePage() {
  return (
    <div className="space-y-20 sm:space-y-28">
      <VisitBeacon />
      <section className="space-y-10">
        <div className="max-w-3xl">
          <Eyebrow>For Australian landlords who self-manage</Eyebrow>
          <h1 className="mt-4 text-4xl leading-[1.05] font-bold sm:text-6xl">Never miss a rental compliance deadline again.</h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-muted">
            RentCert remembers when your smoke alarm, electrical and gas checks are due, keeps the certificates in one place,
            and emails you before each date.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/sign-up" className={`${buttonClasses("primary")} px-6 py-3 text-base`}>
              Start free
            </Link>
            <a href="#how-it-works" className={`${buttonClasses("secondary")} px-6 py-3 text-base`}>
              See how it works
            </a>
            <p className="text-sm text-ink-muted sm:ml-2">Free trial for 1 property. No card needed.</p>
          </div>
        </div>

        <figure>
          <div className="overflow-hidden rounded-lg border border-ink bg-surface shadow-[8px_8px_0_0_var(--color-tag)]">
            <Image
              src={dashboardShot}
              alt="The RentCert dashboard: a summary of overdue, due soon and up-to-date checks above a table of upcoming deadlines for three example properties."
              sizes="(min-width: 1152px) 1120px, 100vw"
              priority
              className="h-auto w-full"
            />
          </div>
          <figcaption className="mt-4 text-sm text-ink-muted">Example account. Status is based on the dates you enter.</figcaption>
        </figure>
      </section>

      <section aria-labelledby="problem-heading" className="grid gap-6 border-t border-ink pt-8 md:grid-cols-[1fr_2fr]">
        <h2 id="problem-heading" className="text-2xl font-bold sm:text-3xl">
          Compliance dates are easy to lose track of
        </h2>
        <p className="text-lg text-ink-muted">
          Smoke alarm, electrical and gas checks come around every one or two years, often at different times for each
          property. The certificates end up in email threads and drawers. RentCert keeps your compliance records organised
          in one place.
        </p>
      </section>

      <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-8">
        <h2 id="how-heading" className="text-2xl font-bold sm:text-3xl">
          How it works
        </h2>
        {/* A real sequence, so the steps are numbered and sit on one rule. */}
        <ol className="mt-8 grid gap-8 border-ink sm:grid-cols-2 sm:border-t-2 lg:grid-cols-4 lg:gap-6">
          {STEPS.map(([title, body], index) => (
            <li key={title} className="relative border-t-2 border-ink pt-5 sm:border-t-0">
              <span aria-hidden="true" className="absolute -top-[7px] left-0 h-3 w-3 bg-tag ring-2 ring-ink" />
              <p className="font-mono text-xs font-semibold tracking-[0.08em] text-ink-muted">
                <span className="sr-only">Step </span>
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-2 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-ink-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Features" className="grid gap-10 md:grid-cols-2 md:gap-12">
        <div className="border-t border-line pt-6">
          <Eyebrow>Certificate vault</Eyebrow>
          <h2 className="mt-3 text-xl font-bold">Every certificate, filed against its check</h2>
          <p className="mt-2 text-ink-muted">
            Store certificates in one secure place. Files are private to your account, and you can download a Compliance
            Pack PDF for each property whenever you need one.
          </p>
        </div>
        <div className="border-t border-line pt-6">
          <Eyebrow>Reminder emails</Eyebrow>
          <h2 className="mt-3 text-xl font-bold">A reminder before each date</h2>
          <p className="mt-2 text-ink-muted">
            Get reminders before the dates you&apos;ve entered, with a link straight to the property. Turn them off any time.
          </p>
        </div>
      </section>

      <section aria-labelledby="pricing-heading">
        <h2 id="pricing-heading" className="text-2xl font-bold sm:text-3xl">
          Pricing
        </h2>
        <div className="mt-8">
          <PricingCards />
        </div>
      </section>

      <Faq />

      <section aria-labelledby="disclaimer-heading" className="border-l-[3px] border-ink bg-surface px-5 py-4">
        <h2 id="disclaimer-heading" className="text-base font-bold">
          Important
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          RentCert is a tracking and document-storage tool. It does not perform inspections, issue certificates or provide
          legal, electrical, gas, smoke alarm or other compliance advice. Reminder dates are calculated from the dates you
          enter.
        </p>
      </section>

      <section className="on-ink flex flex-col gap-6 rounded-lg bg-ink px-6 py-10 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="flex items-start gap-4">
          <LogoMark size={44} />
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Keep your compliance records organised.</h2>
            <p className="mt-2 text-bar-muted">Add your first property in a couple of minutes.</p>
          </div>
        </div>
        <Link
          href="/sign-up"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-tag px-6 py-3 font-semibold text-ink hover:bg-[#ffd43b]"
        >
          Start free
        </Link>
      </section>
    </div>
  );
}
