import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

const PLANS = [
  { name: "Single Property", price: "$9", detail: "1 property", featured: false },
  { name: "Portfolio", price: "$19", detail: "Up to 5 properties", featured: true },
] as const;

const FEATURES = ["Compliance date tracking", "Certificate storage", "Email reminders", "Compliance Pack PDF", "Share with a co-owner"];

function Tick() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" aria-hidden="true" className="shrink-0 text-ink">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

// Two plans side by side, split by a rule. The plan for more than one property is marked by its
// solid button and a line of text, not a badge.
export function PricingCards() {
  return (
    <div className="space-y-4">
      <ul className="grid border-y-2 border-ink md:grid-cols-2">
        {PLANS.map((plan) => (
          <li key={plan.name} className="flex flex-col py-7 not-last:border-b not-last:border-line md:px-8 md:first:pl-0 md:last:pr-0 md:not-last:border-r md:not-last:border-b-0">
            <h3 className="text-xl font-bold">{plan.name}</h3>
            <p className="mt-1 text-sm text-ink-muted">{plan.featured ? "Best for more than one property" : "For a single rental"}</p>
            <p className="mt-4 flex items-baseline gap-2">
              <span className="font-mono text-4xl font-semibold">{plan.price}</span>
              <span className="text-ink-muted">AUD / month, incl. GST</span>
            </p>
            <p className="mt-1 font-semibold">{plan.detail}</p>
            <ul className="mt-5 space-y-2">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Tick />
                  {feature}
                </li>
              ))}
            </ul>
            <Link href="/sign-up" className={`${buttonClasses(plan.featured ? "primary" : "secondary")} mt-7 py-3`}>
              Start free
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-ink-muted">Every account starts with a free trial for 1 property. No card needed to start.</p>
    </div>
  );
}
