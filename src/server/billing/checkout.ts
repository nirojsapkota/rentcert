import "server-only";
import type { Plan } from "@/generated/prisma/client";
import { track } from "@/server/analytics/track";
import { recordAuditEvent } from "@/server/audit";
import { db } from "@/server/db";
import { appUrl } from "@/server/mail/app-url";
import { getEntitlement } from "./entitlements";
import { ACTIVE_SUBSCRIPTION_STATUSES, PROPERTY_LIMITS, priceIdFor } from "./plans";
import { getStripe, type StripeLike } from "./stripe";

// Stripe needs trial_end at least 48 hours ahead.
const MIN_TRIAL_REMAINING_MS = 49 * 60 * 60 * 1000;

async function customerFor(userId: string, stripe: StripeLike): Promise<string> {
  const existing = await db.billingAccount.findUnique({ where: { userId } });
  if (existing) return existing.stripeCustomerId;

  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, name: true } });
  const customer = await stripe.customers.create(
    { email: user.email, name: user.name, metadata: { userId } },
    { idempotencyKey: `customer-${userId}` },
  );
  const account = await db.billingAccount.upsert({
    where: { userId },
    create: { userId, stripeCustomerId: customer.id },
    update: {},
  });
  return account.stripeCustomerId;
}

export class AlreadySubscribedError extends Error {
  name = "AlreadySubscribedError";
}

// Returns the URL of a Stripe-hosted Checkout page. No card data ever reaches the app.
export async function startCheckout(userId: string, plan: Plan, stripe: StripeLike = getStripe(), now: Date = new Date()): Promise<string> {
  const entitlement = await getEntitlement(userId, now);
  // One subscription per account. Plan changes go through the billing portal.
  if (entitlement.subscription) throw new AlreadySubscribedError();
  const customer = await customerFor(userId, stripe);
  const keepTrial = entitlement.trialEndsAt.getTime() - now.getTime() > MIN_TRIAL_REMAINING_MS;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: userId,
    metadata: { userId },
    line_items: [{ price: priceIdFor(plan), quantity: 1 }],
    // Prices are AUD only. Adaptive Pricing would show the visitor's local currency (e.g. NPR).
    adaptive_pricing: { enabled: false },
    subscription_data: {
      metadata: { userId },
      // Charge from the end of the in-app trial, when enough of it is left.
      ...(keepTrial ? { trial_end: Math.floor(entitlement.trialEndsAt.getTime() / 1000) } : {}),
    },
    success_url: appUrl("/billing?checkout=success"),
    cancel_url: appUrl("/billing?checkout=cancelled"),
  });
  if (!session.url) throw new Error("Stripe did not return a Checkout URL");

  await recordAuditEvent({ userId, resourceType: "user", resourceId: userId, action: "billing.checkout_started", metadata: { plan } });
  await track("checkout_started", userId);
  return session.url;
}

export type PlanChangeResult = { ok: true; url: string } | { ok: false; reason: "no_subscription" | "same_plan" | "too_many_properties" };

// Opens Stripe's "confirm plan change" page for the current subscription. Stripe shows the
// prorated amount and applies the change; the customer.subscription.updated webhook stores it.
export async function startPlanChange(
  userId: string,
  plan: Plan,
  activeProperties: number,
  stripe: StripeLike = getStripe(),
): Promise<PlanChangeResult> {
  const entitlement = await getEntitlement(userId);
  if (!entitlement.subscription) return { ok: false, reason: "no_subscription" };
  if (entitlement.subscription.plan === plan) return { ok: false, reason: "same_plan" };
  if (activeProperties > PROPERTY_LIMITS[plan]) return { ok: false, reason: "too_many_properties" };

  const current = await db.subscription.findFirstOrThrow({
    where: { billingAccount: { userId }, status: { in: ACTIVE_SUBSCRIPTION_STATUSES } },
    orderBy: { updatedAt: "desc" },
    select: { stripeSubscriptionId: true, billingAccount: { select: { stripeCustomerId: true } } },
  });
  const subscription = await stripe.subscriptions.retrieve(current.stripeSubscriptionId);
  const item = subscription.items.data[0];
  if (!item) throw new Error("Subscription has no items");

  const session = await stripe.billingPortal.sessions.create({
    customer: current.billingAccount.stripeCustomerId,
    return_url: appUrl("/billing"),
    flow_data: {
      type: "subscription_update_confirm",
      subscription_update_confirm: {
        subscription: subscription.id,
        items: [{ id: item.id, price: priceIdFor(plan), quantity: 1 }],
      },
      after_completion: { type: "redirect", redirect: { return_url: appUrl("/billing?plan=changed") } },
    },
  });

  await recordAuditEvent({ userId, resourceType: "user", resourceId: userId, action: "billing.plan_change_started", metadata: { plan } });
  return { ok: true, url: session.url };
}

export async function openBillingPortal(userId: string, stripe: StripeLike = getStripe()): Promise<string | null> {
  const account = await db.billingAccount.findUnique({ where: { userId } });
  if (!account) return null;
  const session = await stripe.billingPortal.sessions.create({ customer: account.stripeCustomerId, return_url: appUrl("/billing") });
  return session.url;
}

// Called before account deletion: stop charging immediately, without a refund.
export async function cancelSubscriptionsForUser(userId: string, stripe?: StripeLike) {
  const account = await db.billingAccount.findUnique({
    where: { userId },
    include: { subscriptions: { where: { status: { notIn: ["canceled", "incomplete_expired"] } } } },
  });
  for (const subscription of account?.subscriptions ?? []) {
    // Only reach for the Stripe client when there is something to cancel.
    await (stripe ?? getStripe()).subscriptions.cancel(subscription.stripeSubscriptionId, { prorate: false });
  }
}
