import "server-only";
import type Stripe from "stripe";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { getStripe, type StripeLike } from "./stripe";
import { idOf, upsertSubscription } from "./subscriptions";

export type WebhookResult = { status: number; body: string };

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

function subscriptionIdFor(event: Stripe.Event): string | undefined {
  if (event.type === "checkout.session.completed") return idOf(event.data.object.subscription);
  if (SUBSCRIPTION_EVENTS.has(event.type)) return (event.data.object as Stripe.Subscription).id;
  if (event.type === "invoice.payment_failed") return idOf(event.data.object.parent?.subscription_details?.subscription);
  return undefined;
}

// Verifies, de-duplicates and applies one Stripe webhook. Returns the HTTP response to send.
export async function handleStripeWebhook(
  rawBody: string,
  signature: string | null,
  stripe: StripeLike = getStripe(),
  secret: string | undefined = process.env.STRIPE_WEBHOOK_SECRET,
): Promise<WebhookResult> {
  if (!signature || !secret) return { status: 400, body: "Missing signature" };
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, secret);
  } catch {
    return { status: 400, body: "Invalid signature" };
  }

  if (await db.stripeEvent.findUnique({ where: { id: event.id } })) return { status: 200, body: "Duplicate" };

  // Fetch the current subscription before the transaction; never hold a transaction open on a network call.
  const subscriptionId = subscriptionIdFor(event);
  const subscription = subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId) : null;

  try {
    await db.$transaction(async (tx) => {
      await tx.stripeEvent.create({ data: { id: event.id, type: event.type } });

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const userId = session.client_reference_id ?? session.metadata?.userId;
        const customerId = idOf(session.customer);
        if (userId && customerId) {
          const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
          if (user) {
            await tx.billingAccount.upsert({ where: { userId }, create: { userId, stripeCustomerId: customerId }, update: {} });
          }
        }
      }
      if (subscription) await upsertSubscription(tx, subscription);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: 200, body: "Duplicate" }; // processed concurrently by another delivery
    }
    throw error; // 500: Stripe retries later
  }
  return { status: 200, body: "OK" };
}
