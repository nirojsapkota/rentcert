import "server-only";
import type Stripe from "stripe";
import type { Prisma } from "@/generated/prisma/client";
import { recordAuditEvent } from "@/server/audit";
import { planForPriceId } from "./plans";

const idOf = (value: string | { id: string } | null | undefined) => (typeof value === "string" ? value : value?.id);
const toDate = (seconds: number | null | undefined) => (seconds ? new Date(seconds * 1000) : null);

// Writes the current Stripe state of one subscription. Callers always pass a subscription freshly
// retrieved from the Stripe API, so events arriving out of order still end in the right state.
export async function upsertSubscription(tx: Prisma.TransactionClient, subscription: Stripe.Subscription) {
  const customerId = idOf(subscription.customer);
  const account = customerId ? await tx.billingAccount.findUnique({ where: { stripeCustomerId: customerId } }) : null;
  if (!account) {
    console.warn("[billing] subscription for an unknown customer ignored");
    return;
  }
  const item = subscription.items.data[0];
  const plan = planForPriceId(item?.price.id);
  if (!plan) {
    console.warn("[billing] subscription with an unknown price ignored");
    return;
  }

  const data = {
    plan,
    status: subscription.status,
    currentPeriodStart: toDate(item.current_period_start),
    currentPeriodEnd: toDate(item.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialEnd: toDate(subscription.trial_end),
  };
  const existing = await tx.subscription.findUnique({ where: { stripeSubscriptionId: subscription.id } });
  await tx.subscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    create: { ...data, stripeSubscriptionId: subscription.id, billingAccountId: account.id },
    update: data,
  });
  if (!existing || existing.plan !== plan || existing.status !== subscription.status) {
    await recordAuditEvent(
      {
        userId: account.userId,
        resourceType: "subscription",
        resourceId: subscription.id,
        action: "billing.subscription_changed",
        metadata: { plan, status: subscription.status },
      },
      tx,
    );
  }
}

export { idOf };
