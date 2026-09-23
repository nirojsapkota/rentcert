import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { ACTIVE_SUBSCRIPTION_STATUSES, PROPERTY_LIMITS, type EntitlementPlan } from "./plans";

// The only place that decides what an account may do. Pages, commands and jobs all ask here.

export type Entitlement = {
  plan: EntitlementPlan;
  propertyLimit: number;
  canWrite: boolean;
  trialEndsAt: Date;
  subscription: { plan: "PROPERTY" | "PORTFOLIO"; status: string; currentPeriodEnd: Date | null; cancelAtPeriodEnd: boolean } | null;
};

export async function getEntitlement(userId: string, now: Date = new Date(), client: Prisma.TransactionClient = db): Promise<Entitlement> {
  const user = await client.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      trialEndsAt: true,
      billingAccount: {
        select: {
          subscriptions: {
            where: { status: { in: ACTIVE_SUBSCRIPTION_STATUSES } },
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: { plan: true, status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
          },
        },
      },
    },
  });
  const subscription = user.billingAccount?.subscriptions[0] ?? null;
  const plan: EntitlementPlan = subscription ? subscription.plan : user.trialEndsAt > now ? "TRIAL" : "READ_ONLY";
  return { plan, propertyLimit: PROPERTY_LIMITS[plan], canWrite: plan !== "READ_ONLY", trialEndsAt: user.trialEndsAt, subscription };
}

// Call inside the transaction that adds or restores a property. The advisory lock serialises
// concurrent requests from the same user, so two tabs cannot both take the last slot.
export async function hasPropertySlot(tx: Prisma.TransactionClient, userId: string, activeCount: () => Promise<number>) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`property-slot:${userId}`}))`;
  const entitlement = await getEntitlement(userId, new Date(), tx);
  return entitlement.canWrite && (await activeCount()) < entitlement.propertyLimit;
}

export async function canWrite(userId: string): Promise<boolean> {
  return (await getEntitlement(userId)).canWrite;
}

// Prisma filter for users who are still entitled (trial or active subscription), for jobs.
export function entitledUserWhere(now: Date): Prisma.UserWhereInput {
  return {
    OR: [
      { trialEndsAt: { gt: now } },
      { billingAccount: { subscriptions: { some: { status: { in: ACTIVE_SUBSCRIPTION_STATUSES } } } } },
    ],
  };
}
