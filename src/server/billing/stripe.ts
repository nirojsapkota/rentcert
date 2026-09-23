import "server-only";
import Stripe from "stripe";

let client: Stripe | undefined;

// STRIPE_API_HOST/PORT/PROTOCOL point the SDK at a local fake in end-to-end tests only.
export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client = new Stripe(key, {
    maxNetworkRetries: 2,
    ...(process.env.STRIPE_API_HOST
      ? {
          host: process.env.STRIPE_API_HOST,
          port: Number(process.env.STRIPE_API_PORT ?? 443),
          protocol: (process.env.STRIPE_API_PROTOCOL ?? "https") as "http" | "https",
        }
      : {}),
  });
  return client;
}

// The subset of the SDK this app uses, so tests can pass a fake.
export type StripeLike = Pick<Stripe, "webhooks"> & {
  customers: Pick<Stripe["customers"], "create">;
  subscriptions: Pick<Stripe["subscriptions"], "retrieve" | "cancel">;
  checkout: { sessions: Pick<Stripe["checkout"]["sessions"], "create"> };
  billingPortal: { sessions: Pick<Stripe["billingPortal"]["sessions"], "create"> };
};
