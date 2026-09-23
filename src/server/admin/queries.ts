import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { ACTIVE_SUBSCRIPTION_STATUSES } from "@/server/billing/plans";
import { db } from "@/server/db";

// Cross-account reads for admins. By design this module never reads compliance_documents:
// admins cannot see users' documents or their names.

export const ADMIN_PAGE_SIZE = 25;

const page = (value: number) => Math.max(1, value);

export async function listUsers({ search, pageNumber }: { search: string; pageNumber: number }) {
  const where: Prisma.UserWhereInput = search ? { email: { contains: search.trim().toLowerCase() } } : {};
  const [total, users] = await db.$transaction([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page(pageNumber) - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        trialEndsAt: true,
        role: true,
        _count: { select: { properties: { where: { archivedAt: null } } } },
        billingAccount: { select: { subscriptions: { orderBy: { updatedAt: "desc" }, take: 1, select: { plan: true, status: true } } } },
      },
    }),
  ]);
  return { users, total, pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
}

export async function listPropertiesForAdmin(pageNumber: number) {
  const [total, properties] = await db.$transaction([
    db.property.count(),
    db.property.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page(pageNumber) - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      // No street address in admin lists.
      select: {
        id: true,
        suburb: true,
        state: true,
        postcode: true,
        archivedAt: true,
        createdAt: true,
        user: { select: { email: true } },
        _count: { select: { complianceRecords: true } },
      },
    }),
  ]);
  return { properties, total, pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
}

export async function listSubscriptionsForAdmin(pageNumber: number) {
  const [total, subscriptions] = await db.$transaction([
    db.subscription.count(),
    db.subscription.findMany({
      orderBy: { updatedAt: "desc" },
      skip: (page(pageNumber) - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        plan: true,
        status: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        billingAccount: { select: { user: { select: { email: true } } } },
      },
    }),
  ]);
  return { subscriptions, total, pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
}

export async function listRequirementsForAdmin() {
  return db.complianceRequirement.findMany({ orderBy: [{ jurisdiction: "asc" }, { sortOrder: "asc" }] });
}

export async function findRequirementForAdmin(id: string) {
  return db.complianceRequirement.findUnique({ where: { id } }).catch(() => null);
}

const MONTHLY_PRICE_AUD = { PROPERTY: 9, PORTFOLIO: 19 } as const;

type MonthRow = { month: string; name: string; count: bigint };

// Month-by-month funnel and revenue figures (PLAN.md sections 59 and 60) for the last `months` months.
export async function getMetrics(months = 6) {
  const [events, firstDocuments, visits, cancellations, active] = await Promise.all([
    db.$queryRaw<MonthRow[]>`
      SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, name, count(*) AS count
      FROM product_events
      WHERE created_at >= date_trunc('month', now()) - make_interval(months => ${months - 1})
      GROUP BY 1, 2`,
    // Users whose first document upload happened in the month.
    db.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT to_char(date_trunc('month', first_upload), 'YYYY-MM') AS month, count(*) AS count
      FROM (SELECT user_id, min(created_at) AS first_upload FROM product_events
            WHERE name = 'document_uploaded' AND user_id IS NOT NULL GROUP BY user_id) firsts
      WHERE first_upload >= date_trunc('month', now()) - make_interval(months => ${months - 1})
      GROUP BY 1`,
    db.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT to_char(date_trunc('month', day), 'YYYY-MM') AS month, sum(count)::bigint AS count
      FROM landing_visits
      WHERE day >= date_trunc('month', now()) - make_interval(months => ${months - 1})
      GROUP BY 1`,
    db.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT to_char(date_trunc('month', updated_at), 'YYYY-MM') AS month, count(*) AS count
      FROM subscriptions
      WHERE status = 'canceled' AND updated_at >= date_trunc('month', now()) - make_interval(months => ${months - 1})
      GROUP BY 1`,
    db.subscription.groupBy({ by: ["plan"], where: { status: { in: ACTIVE_SUBSCRIPTION_STATUSES } }, _count: { _all: true } }),
  ]);

  const monthKeys = Array.from({ length: months }, (_, index) => {
    const date = new Date();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - (months - 1 - index));
    return date.toISOString().slice(0, 7);
  });
  const lookup = (rows: { month: string; count: bigint }[], month: string) => Number(rows.find((row) => row.month === month)?.count ?? 0);
  const event = (month: string, name: string) => Number(events.find((row) => row.month === month && row.name === name)?.count ?? 0);

  const activeByPlan = Object.fromEntries(active.map((row) => [row.plan, row._count._all])) as Partial<Record<"PROPERTY" | "PORTFOLIO", number>>;
  const mrr = (activeByPlan.PROPERTY ?? 0) * MONTHLY_PRICE_AUD.PROPERTY + (activeByPlan.PORTFOLIO ?? 0) * MONTHLY_PRICE_AUD.PORTFOLIO;

  return {
    mrr,
    activeSubscriptions: (activeByPlan.PROPERTY ?? 0) + (activeByPlan.PORTFOLIO ?? 0),
    months: monthKeys.map((month) => ({
      month,
      visits: lookup(visits, month),
      signups: event(month, "signup"),
      propertiesCreated: event(month, "property_created"),
      firstCertificates: lookup(firstDocuments, month),
      remindersSent: event(month, "reminder_sent"),
      packsDownloaded: event(month, "compliance_pack_downloaded"),
      checkoutsStarted: event(month, "checkout_started"),
      subscriptionsStarted: event(month, "subscription_started"),
      cancellations: lookup(cancellations, month),
    })),
  };
}
