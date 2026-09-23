import type { Plan } from "@/generated/prisma/client";

export type EntitlementPlan = "TRIAL" | Plan | "READ_ONLY";

export const PROPERTY_LIMITS: Record<EntitlementPlan, number> = {
  TRIAL: 1,
  PROPERTY: 1,
  PORTFOLIO: 5,
  READ_ONLY: 0,
};

export const PLAN_DETAILS: Record<Plan, { name: string; price: string; properties: string }> = {
  PROPERTY: { name: "Single Property", price: "$9", properties: "1 property" },
  PORTFOLIO: { name: "Portfolio", price: "$19", properties: "Up to 5 properties" },
};

// Stripe statuses that keep paid access. past_due keeps access while Stripe retries payment.
export const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"];

export function priceIdFor(plan: Plan): string {
  const id = plan === "PROPERTY" ? process.env.STRIPE_PRICE_PROPERTY : process.env.STRIPE_PRICE_PORTFOLIO;
  if (!id) throw new Error(`Missing Stripe price id for ${plan}`);
  return id;
}

export function planForPriceId(priceId: string | undefined): Plan | null {
  if (priceId && priceId === process.env.STRIPE_PRICE_PROPERTY) return "PROPERTY";
  if (priceId && priceId === process.env.STRIPE_PRICE_PORTFOLIO) return "PORTFOLIO";
  return null;
}
