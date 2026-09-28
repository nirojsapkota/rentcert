import type { Metadata } from "next";
import { Faq } from "@/components/marketing/faq";
import { PricingCards } from "@/components/marketing/pricing-cards";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-bold text-deep">Pricing</h1>
        <p className="mt-2 text-ink-muted">Simple monthly plans in Australian dollars. Cancel any time from your billing page.</p>
      </div>
      <PricingCards />
      <Faq />
    </div>
  );
}
