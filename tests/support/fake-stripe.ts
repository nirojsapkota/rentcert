import Stripe from "stripe";
import { vi } from "vitest";
import type { StripeLike } from "@/server/billing/stripe";

export const WEBHOOK_SECRET = "whsec_test_secret";
const real = new Stripe("sk_test_offline"); // used only for local signature helpers, never for API calls

type SubscriptionState = { customer: string; status: string; price: string; cancelAtPeriodEnd?: boolean };

// A fake Stripe client. Subscriptions are served from `subscriptions`, like the real API would.
export function fakeStripe() {
  const subscriptions = new Map<string, SubscriptionState>();
  const client = {
    webhooks: real.webhooks,
    customers: { create: vi.fn(async (_params: unknown, _options?: unknown) => ({ id: `cus_${Math.random().toString(36).slice(2)}` })) },
    subscriptions: {
      retrieve: vi.fn(async (id: string) => {
        const state = subscriptions.get(id);
        if (!state) throw new Error(`No such subscription: ${id}`);
        return {
          id,
          object: "subscription",
          customer: state.customer,
          status: state.status,
          cancel_at_period_end: state.cancelAtPeriodEnd ?? false,
          trial_end: null,
          items: { data: [{ price: { id: state.price }, current_period_start: 1_790_000_000, current_period_end: 1_792_592_000 }] },
        };
      }),
      cancel: vi.fn(async (id: string, _params?: unknown) => ({ id, status: "canceled" })),
    },
    checkout: { sessions: { create: vi.fn(async (_params: unknown) => ({ id: "cs_test", url: "https://checkout.stripe.test/cs_test" })) } },
    billingPortal: { sessions: { create: vi.fn(async (_params: unknown) => ({ url: "https://billing.stripe.test/session" })) } },
  };
  // `client` is what the app code receives; `mocks` exposes the same functions with vi.fn typing.
  return { client: client as unknown as StripeLike, mocks: client, subscriptions };
}

export async function signedEvent(event: { id: string; type: string; data: { object: Record<string, unknown> } }) {
  const payload = JSON.stringify({ object: "event", api_version: "2026-08-26.dahlia", created: 1_790_000_000, ...event });
  const signature = await real.webhooks.generateTestHeaderStringAsync({ payload, secret: WEBHOOK_SECRET });
  return { payload, signature };
}
