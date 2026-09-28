import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

const PLANS = [
  { name: "Single Property", price: "$9", detail: "1 property", featured: false },
  { name: "Portfolio", price: "$19", detail: "Up to 5 properties", featured: true },
] as const;

const FEATURES = ["Compliance date tracking", "Certificate storage", "Email reminders", "Compliance Pack PDF", "Share with a co-owner"];

function Tick() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-brand">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

export function PricingCards() {
  return (
    <div className="space-y-4">
      <ul className="grid gap-4 md:grid-cols-2">
        {PLANS.map((plan) => (
          <li
            key={plan.name}
            className={`relative flex flex-col rounded-lg border bg-surface p-7 ${plan.featured ? "border-brand shadow-[0_24px_48px_-32px_rgba(13,59,58,0.45)]" : "border-line"}`}
          >
            {plan.featured && (
              <span className="absolute -top-3 left-7 rounded-full bg-accent px-3 py-1 text-xs font-bold text-[#3d2600]">
                Best for more than one property
              </span>
            )}
            <h3 className="text-xl font-bold">{plan.name}</h3>
            <p className="mt-3">
              <span className="font-display text-4xl font-bold text-deep">{plan.price}</span>
              <span className="text-ink-muted"> AUD / month, incl. GST</span>
            </p>
            <p className="mt-1 font-semibold text-ink-muted">{plan.detail}</p>
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
