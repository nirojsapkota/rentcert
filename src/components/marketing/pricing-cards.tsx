import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

const PLANS = [
  { name: "Single Property", price: "$9", detail: "1 property" },
  { name: "Portfolio", price: "$19", detail: "Up to 5 properties" },
] as const;

export function PricingCards() {
  return (
    <div className="space-y-4">
      <ul className="grid gap-4 md:grid-cols-2">
        {PLANS.map((plan) => (
          <li key={plan.name} className="flex flex-col rounded-lg border border-line bg-surface p-6">
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <p className="mt-2">
              <span className="text-3xl font-bold">{plan.price}</span>
              <span className="text-ink-muted"> AUD / month, incl. GST</span>
            </p>
            <p className="mt-1 text-ink-muted">{plan.detail}</p>
            <ul className="mt-4 space-y-1 text-sm">
              <li>✓ Compliance date tracking</li>
              <li>✓ Certificate storage</li>
              <li>✓ Email reminders</li>
              <li>✓ Compliance Pack PDF</li>
            </ul>
            <Link href="/sign-up" className={`${buttonClasses("primary")} mt-6`}>
              Start free
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-ink-muted">Every account starts with a free trial for 1 property. No card needed to start.</p>
    </div>
  );
}
