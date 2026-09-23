import "server-only";
import type { Plan } from "@/generated/prisma/client";
import { recordAuditEvent } from "@/server/audit";
import { db } from "@/server/db";
import { appUrl } from "@/server/mail/app-url";
import { getEntitlement } from "./entitlements";
import { priceIdFor } from "./plans";
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

// Returns the URL of a Stripe-hosted Checkout page. No card data ever reaches the app.
export async function startCheckout(userId: string, plan: Plan, stripe: StripeLike = getStripe(), now: Date = new Date()): Promise<string> {
  const entitlement = await getEntitlement(userId, now);
  const customer = await customerFor(userId, stripe);
  const keepTrial = entitlement.trialEndsAt.getTime() - now.getTime() > MIN_TRIAL_REMAINING_MS;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: userId,
    metadata: { userId },
    line_items: [{ price: priceIdFor(plan), quantity: 1 }],
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
  return session.url;
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
