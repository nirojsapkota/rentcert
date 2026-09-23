import "server-only";
import { addMonths } from "@/lib/calendar-date";
import { isUuid } from "@/lib/ids";
import type { Prisma } from "@/generated/prisma/client";
import { GENERIC_JURISDICTION, requirementsFor } from "@/server/compliance/requirements";
import { buildSchedule, type RecordSummary, type RequirementInfo, type ScheduleItem } from "@/server/compliance/schedule";
import { db } from "@/server/db";
import { findPropertyForUser, listActivePropertiesForUser } from "@/server/properties/queries";

// Owner-scoped reads. Every function checks the property belongs to `userId` first.

export const HISTORY_PAGE_SIZE = 20;

const recordSummarySelect = {
  id: true,
  kind: true,
  completedOn: true,
  nextDueOn: true,
  createdAt: true,
  propertyId: true,
  requirement: { select: { code: true } },
} satisfies Prisma.ComplianceRecordSelect;

type RecordRow = Prisma.ComplianceRecordGetPayload<{ select: typeof recordSummarySelect }>;

function toSummary(row: RecordRow): RecordSummary {
  return { id: row.id, code: row.requirement.code, kind: row.kind, completedOn: row.completedOn, nextDueOn: row.nextDueOn, createdAt: row.createdAt };
}

export async function getPropertySchedule(userId: string, propertyId: string, today: string) {
  const property = await findPropertyForUser(userId, propertyId);
  if (!property) return null;

  const [{ jurisdiction, requirements }, exclusions, records] = await Promise.all([
    requirementsFor(property.state),
    db.propertyRequirementExclusion.findMany({ where: { propertyId: property.id }, select: { requirementCode: true } }),
    db.complianceRecord.findMany({ where: { propertyId: property.id }, select: recordSummarySelect }),
  ]);

  const items = buildSchedule(
    requirements,
    new Set(exclusions.map((row) => row.requirementCode)),
    records.map(toSummary),
    today,
  );
  return { property, jurisdiction, isGeneric: jurisdiction === GENERIC_JURISDICTION, items };
}

export async function listPropertyHistory(userId: string, propertyId: string, page: number) {
  const property = await findPropertyForUser(userId, propertyId);
  if (!property) return null;

  const where = { propertyId: property.id };
  const currentPage = Math.max(page, 1);
  const [total, records] = await db.$transaction([
    db.complianceRecord.count({ where }),
    db.complianceRecord.findMany({
      where,
      include: {
        requirement: { select: { name: true, code: true } },
        documents: { select: { id: true, filename: true }, orderBy: { uploadedAt: "asc" } },
      },
      orderBy: [{ completedOn: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      skip: (currentPage - 1) * HISTORY_PAGE_SIZE,
      take: HISTORY_PAGE_SIZE,
    }),
  ]);
  return { records, total, page: currentPage, pageCount: Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE)) };
}

export async function findRecordForUser(userId: string, propertyId: string, recordId: string) {
  if (!isUuid(recordId) || !isUuid(propertyId)) return null;
  return db.complianceRecord.findFirst({
    where: { id: recordId, propertyId, property: { userId } },
    include: { requirement: true, property: { select: { archivedAt: true } } },
  });
}

export type DashboardFilter = "all" | "overdue" | "due_soon" | "upcoming" | "completed";

export type DashboardRow = {
  propertyId: string;
  property: { nickname: string | null; addressLine1: string; addressLine2: string | null; suburb: string; state: string; postcode: string };
  item: ScheduleItem;
};

// Fixed number of queries regardless of how many properties the user has.
export async function getDashboard(userId: string, today: string) {
  const properties = await listActivePropertiesForUser(userId);
  const propertyIds = properties.map((property) => property.id);

  const [allRequirements, exclusions, records] = await Promise.all([
    db.complianceRequirement.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.propertyRequirementExclusion.findMany({ where: { propertyId: { in: propertyIds } } }),
    db.complianceRecord.findMany({ where: { propertyId: { in: propertyIds } }, select: recordSummarySelect }),
  ]);

  const rows: DashboardRow[] = properties.flatMap((property) => {
    const specific = allRequirements.filter((row) => row.jurisdiction === property.state);
    const requirements: RequirementInfo[] =
      specific.length > 0 ? specific : allRequirements.filter((row) => row.jurisdiction === GENERIC_JURISDICTION);
    const excluded = new Set(exclusions.filter((row) => row.propertyId === property.id).map((row) => row.requirementCode));
    const propertyRecords = records.filter((row) => row.propertyId === property.id).map(toSummary);
    return buildSchedule(requirements, excluded, propertyRecords, today)
      .filter((item) => item.status !== "not_applicable")
      .map((item) => ({ propertyId: property.id, property, item }));
  });

  const dated = rows.filter((row) => row.item.nextDueOn !== null).sort((a, b) => a.item.nextDueOn!.localeCompare(b.item.nextDueOn!));
  const counts = {
    overdue: dated.filter((row) => row.item.status === "overdue").length,
    dueSoon: dated.filter((row) => row.item.status === "due" || row.item.status === "due_soon").length,
    upToDate: dated.filter((row) => row.item.status === "upcoming").length,
    notSetUp: rows.filter((row) => row.item.status === "not_set_up").length,
  };
  return { propertyCount: properties.length, counts, rows: dated, notSetUp: rows.filter((row) => row.item.status === "not_set_up") };
}

export function filterDashboardRows(rows: DashboardRow[], filter: Exclude<DashboardFilter, "completed">) {
  if (filter === "all") return rows;
  if (filter === "due_soon") return rows.filter((row) => row.item.status === "due" || row.item.status === "due_soon");
  return rows.filter((row) => row.item.status === filter);
}

// Completed checks from the last 12 months across active properties, newest first.
export async function listRecentCompletions(userId: string, today: string, limit = 50) {
  const since = addMonths(today, -12);
  return db.complianceRecord.findMany({
    where: {
      kind: "COMPLETED",
      completedOn: { gte: new Date(`${since}T00:00:00Z`) },
      property: { userId, archivedAt: null },
    },
    include: {
      requirement: { select: { name: true } },
      property: { select: { id: true, nickname: true, addressLine1: true, addressLine2: true, suburb: true, state: true, postcode: true } },
    },
    orderBy: [{ completedOn: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}

