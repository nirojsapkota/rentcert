import "server-only";
import { addMonths } from "@/lib/calendar-date";
import { isUuid } from "@/lib/ids";
import type { Prisma } from "@/generated/prisma/client";
import { GENERIC_JURISDICTION, requirementsFor } from "@/server/compliance/requirements";
import {
  buildSchedule,
  currentRecordsByCode,
  type RecordSummary,
  type RequirementInfo,
  type ScheduleItem,
} from "@/server/compliance/schedule";
import { entitledUserWhere } from "@/server/billing/entitlements";
import { db } from "@/server/db";
import { accessibleBy } from "@/server/properties/access";
import { findPropertyForUser, listActivePropertiesForUser } from "@/server/properties/queries";

// Member-scoped reads. Every function checks `userId` owns or collaborates on the property first.

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
    where: { id: recordId, propertyId, property: accessibleBy(userId) },
    include: { requirement: true, property: { select: { archivedAt: true, userId: true } } },
  });
}

export type DashboardFilter = "all" | "overdue" | "due_soon" | "upcoming" | "completed";

export type DashboardRow = {
  propertyId: string;
  property: {
    userId: string;
    user: { firstName: string };
    nickname: string | null;
    addressLine1: string;
    addressLine2: string | null;
    suburb: string;
    state: string;
    postcode: string;
  };
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
      property: { ...accessibleBy(userId), archivedAt: null },
    },
    include: {
      requirement: { select: { name: true } },
      property: { select: { id: true, nickname: true, addressLine1: true, addressLine2: true, suburb: true, state: true, postcode: true } },
    },
    orderBy: [{ completedOn: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}


export type ReminderCandidate = {
  recordId: string;
  propertyId: string;
  userId: string; // the recipient: the owner or one of the owner's collaborators
  timezone: string; // the recipient's
  nextDueOn: string;
  recordCreatedAt: Date;
};

type Recipient = { id: string; timezone: string; emailVerified: boolean; reminderEmailsEnabled: boolean };
const recipientSelect = { id: true, timezone: true, emailVerified: true, reminderEmailsEnabled: true } as const;

// One candidate per current record and recipient, on active properties whose owner is entitled,
// for applicable requirements. Recipients are the owner and the owner's collaborators, each with a
// verified email who wants reminder emails. Used by the reminder scan (with a due-date horizon) and
// to re-check a single record just before sending (with recordIds).
export async function listReminderCandidates(options: {
  nextDueOnOrBefore?: Date;
  recordIds?: string[];
  skipFinished?: boolean; // skip recipients whose final (overdue) reminder for the record already exists
  now?: Date; // the owner must be entitled (trial or paid) at this time
}): Promise<ReminderCandidate[]> {
  const candidates = await db.complianceRecord.findMany({
    where: {
      ...(options.recordIds ? { id: { in: options.recordIds } } : {}),
      ...(options.nextDueOnOrBefore ? { nextDueOn: { lte: options.nextDueOnOrBefore } } : {}),
      property: { archivedAt: null, user: entitledUserWhere(options.now ?? new Date()) },
    },
    select: {
      id: true,
      propertyId: true,
      createdAt: true,
      nextDueOn: true,
      requirement: { select: { code: true } },
      reminders: options.skipFinished ? { where: { reminderType: "OVERDUE_7" }, select: { userId: true } } : false,
      property: {
        select: {
          state: true,
          user: { select: { ...recipientSelect, collaborators: { select: { member: { select: recipientSelect } } } } },
        },
      },
    },
  });
  if (candidates.length === 0) return [];

  const propertyIds = [...new Set(candidates.map((row) => row.propertyId))];
  const [requirements, exclusions, allRecords] = await Promise.all([
    db.complianceRequirement.findMany({ where: { active: true }, select: { jurisdiction: true, code: true } }),
    db.propertyRequirementExclusion.findMany({ where: { propertyId: { in: propertyIds } } }),
    db.complianceRecord.findMany({ where: { propertyId: { in: propertyIds } }, select: recordSummarySelect }),
  ]);

  const currentByProperty = new Map(
    propertyIds.map((id) => [id, currentRecordsByCode(allRecords.filter((row) => row.propertyId === id).map(toSummary))]),
  );
  const codesFor = (state: string) => {
    const specific = requirements.filter((row) => row.jurisdiction === state);
    return new Set((specific.length > 0 ? specific : requirements.filter((row) => row.jurisdiction === GENERIC_JURISDICTION)).map((row) => row.code));
  };

  return candidates.flatMap((row) => {
    const code = row.requirement.code;
    const isCurrent = currentByProperty.get(row.propertyId)?.get(code)?.id === row.id;
    const applicable =
      codesFor(row.property.state).has(code) &&
      !exclusions.some((exclusion) => exclusion.propertyId === row.propertyId && exclusion.requirementCode === code);
    if (!isCurrent || !applicable) return [];
    const owner = row.property.user;
    const finished = new Set((row.reminders || []).map((reminder) => reminder.userId));
    const recipients: Recipient[] = [owner, ...owner.collaborators.map((collaborator) => collaborator.member)];
    return recipients
      .filter((recipient) => recipient.emailVerified && recipient.reminderEmailsEnabled && !finished.has(recipient.id))
      .map((recipient) => ({
        recordId: row.id,
        propertyId: row.propertyId,
        userId: recipient.id,
        timezone: recipient.timezone,
        nextDueOn: row.nextDueOn.toISOString().slice(0, 10),
        recordCreatedAt: row.createdAt,
      }));
  });
}

// Every record for a property, newest completion first (for the compliance pack).
export async function listAllPropertyHistory(userId: string, propertyId: string) {
  const property = await findPropertyForUser(userId, propertyId);
  if (!property) return null;
  return db.complianceRecord.findMany({
    where: { propertyId: property.id },
    include: { requirement: { select: { name: true } } },
    orderBy: [{ completedOn: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  });
}

// Every compliance record and exclusion of the user, for the account data export.
export async function listComplianceForExport(userId: string) {
  const [records, exclusions] = await Promise.all([
    db.complianceRecord.findMany({
      where: { property: { userId } },
      include: { requirement: { select: { code: true, name: true, jurisdiction: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.propertyRequirementExclusion.findMany({ where: { property: { userId } } }),
  ]);
  return { records, exclusions };
}
