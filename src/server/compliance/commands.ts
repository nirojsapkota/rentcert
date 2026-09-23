import "server-only";
import { parseCalendarDate, toCalendarDateString } from "@/lib/calendar-date";
import type { CompletionInput, SetupAnswer } from "@/lib/compliance-validation";
import type { Prisma } from "@/generated/prisma/client";
import { recordAuditEvent } from "@/server/audit";
import { nextDueOn } from "@/server/compliance/due-date";
import { requirementsFor } from "@/server/compliance/requirements";
import { db } from "@/server/db";
import { findPropertyForUser } from "@/server/properties/queries";

// Owner-scoped writes. A property or record that is missing or belongs to someone else returns
// "not_found", and callers show the same response for both.

type NotFound = { ok: false; reason: "not_found" };
const NOT_FOUND: NotFound = { ok: false, reason: "not_found" };

function asDate(calendarDate: string): Date {
  const date = parseCalendarDate(calendarDate);
  if (!date) throw new Error(`Invalid calendar date: ${calendarDate}`);
  return date;
}

async function loadOwnedProperty(userId: string, propertyId: string) {
  const property = await findPropertyForUser(userId, propertyId);
  if (!property) return null;
  const { requirements } = await requirementsFor(property.state);
  return { property, requirements };
}

// Codes that already have a record (set up) or are excluded, so setup never runs twice for them.
export async function codesAlreadySetUp(propertyId: string): Promise<Set<string>> {
  const [records, exclusions] = await Promise.all([
    db.complianceRecord.findMany({ where: { propertyId }, select: { requirement: { select: { code: true } } } }),
    db.propertyRequirementExclusion.findMany({ where: { propertyId }, select: { requirementCode: true } }),
  ]);
  return new Set([...records.map((row) => row.requirement.code), ...exclusions.map((row) => row.requirementCode)]);
}

export async function setUpChecks(
  userId: string,
  propertyId: string,
  today: string,
  answers: Record<string, SetupAnswer>,
): Promise<{ ok: true } | NotFound> {
  const owned = await loadOwnedProperty(userId, propertyId);
  if (!owned) return NOT_FOUND;
  const done = await codesAlreadySetUp(owned.property.id);

  await db.$transaction(async (tx) => {
    const summary: Record<string, string> = {};
    for (const requirement of owned.requirements) {
      const answer = answers[requirement.code];
      if (!answer || done.has(requirement.code)) continue;
      summary[requirement.code] = answer.choice;

      if (answer.choice === "not_applicable") {
        await tx.propertyRequirementExclusion.create({ data: { propertyId: owned.property.id, requirementCode: requirement.code } });
      } else if (answer.choice === "unknown") {
        await tx.complianceRecord.create({
          data: { propertyId: owned.property.id, requirementId: requirement.id, kind: "UNKNOWN_LAST_CHECK", nextDueOn: asDate(today) },
        });
      } else {
        await tx.complianceRecord.create({
          data: {
            propertyId: owned.property.id,
            requirementId: requirement.id,
            kind: "COMPLETED",
            completedOn: asDate(answer.lastCheckOn),
            nextDueOn: asDate(nextDueOn(answer.lastCheckOn, requirement.recurrenceMonths)),
          },
        });
      }
    }
    if (Object.keys(summary).length > 0) {
      await recordAuditEvent(
        { userId, resourceType: "property", resourceId: owned.property.id, action: "property.checks_set_up", metadata: summary },
        tx,
      );
    }
  });
  return { ok: true };
}

export async function recordCompletion(
  userId: string,
  propertyId: string,
  code: string,
  input: CompletionInput,
): Promise<{ ok: true; recordId: string; nextDueOn: string } | NotFound> {
  const owned = await loadOwnedProperty(userId, propertyId);
  const requirement = owned?.requirements.find((row) => row.code === code);
  if (!owned || !requirement) return NOT_FOUND;

  const due = nextDueOn(input.completedOn, requirement.recurrenceMonths);
  const record = await db.$transaction(async (tx) => {
    const created = await tx.complianceRecord.create({
      data: {
        propertyId: owned.property.id,
        requirementId: requirement.id,
        kind: "COMPLETED",
        completedOn: asDate(input.completedOn),
        nextDueOn: asDate(due),
        providerName: input.providerName,
        providerLicenceNumber: input.providerLicenceNumber,
        notes: input.notes,
      },
    });
    await recordAuditEvent(
      {
        userId,
        resourceType: "compliance_record",
        resourceId: created.id,
        action: "compliance_record.created",
        metadata: { propertyId: owned.property.id, requirementCode: code, completedOn: input.completedOn, nextDueOn: due },
      },
      tx,
    );
    return created;
  });
  return { ok: true, recordId: record.id, nextDueOn: due };
}

// Fixes a completed record. nextDueOn is recalculated; the audit event keeps old and new values.
export async function updateRecord(
  userId: string,
  propertyId: string,
  recordId: string,
  input: CompletionInput,
): Promise<{ ok: true } | NotFound> {
  const owned = await findPropertyForUser(userId, propertyId);
  if (!owned) return NOT_FOUND;

  return db.$transaction(async (tx) => {
    const record = await tx.complianceRecord.findFirst({
      where: { id: recordId, propertyId: owned.id, kind: "COMPLETED" },
      include: { requirement: { select: { recurrenceMonths: true } } },
    });
    if (!record || !record.completedOn) return NOT_FOUND;

    const next = {
      completedOn: input.completedOn,
      nextDueOn: nextDueOn(input.completedOn, record.requirement.recurrenceMonths),
      providerName: input.providerName,
      providerLicenceNumber: input.providerLicenceNumber,
      notes: input.notes,
    };
    const previous = {
      completedOn: toCalendarDateString(record.completedOn),
      nextDueOn: toCalendarDateString(record.nextDueOn),
      providerName: record.providerName,
      providerLicenceNumber: record.providerLicenceNumber,
      notes: record.notes,
    };
    const changes: Prisma.InputJsonObject = Object.fromEntries(
      (Object.keys(next) as (keyof typeof next)[])
        .filter((field) => previous[field] !== next[field])
        // Notes can hold free text, so only record that they changed.
        .map((field) => [field, field === "notes" ? { changed: true } : { from: previous[field], to: next[field] }]),
    );
    if (Object.keys(changes).length === 0) return { ok: true as const };

    await tx.complianceRecord.update({
      where: { id: record.id },
      data: { ...next, completedOn: asDate(next.completedOn), nextDueOn: asDate(next.nextDueOn) },
    });
    await recordAuditEvent(
      { userId, resourceType: "compliance_record", resourceId: record.id, action: "compliance_record.updated", metadata: { changes } },
      tx,
    );
    return { ok: true as const };
  });
}

export async function setRequirementApplicable(
  userId: string,
  propertyId: string,
  code: string,
  applicable: boolean,
): Promise<{ ok: true } | NotFound> {
  const owned = await loadOwnedProperty(userId, propertyId);
  if (!owned || !owned.requirements.some((row) => row.code === code)) return NOT_FOUND;

  await db.$transaction(async (tx) => {
    const key = { propertyId_requirementCode: { propertyId: owned.property.id, requirementCode: code } };
    const existing = await tx.propertyRequirementExclusion.findUnique({ where: key });
    if (applicable === !existing) return;

    if (applicable) await tx.propertyRequirementExclusion.delete({ where: key });
    else await tx.propertyRequirementExclusion.create({ data: { propertyId: owned.property.id, requirementCode: code } });

    await recordAuditEvent(
      {
        userId,
        resourceType: "property",
        resourceId: owned.property.id,
        action: applicable ? "property.requirement_included" : "property.requirement_excluded",
        metadata: { requirementCode: code },
      },
      tx,
    );
  });
  return { ok: true };
}

// Used by the properties module to refuse deleting a property that has history.
export async function propertyHasRecords(propertyId: string, client: Prisma.TransactionClient = db): Promise<boolean> {
  return (await client.complianceRecord.count({ where: { propertyId } })) > 0;
}
