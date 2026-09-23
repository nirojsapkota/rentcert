import "server-only";
import { parseCalendarDate } from "@/lib/calendar-date";
import type { PropertyInput } from "@/lib/property-validation";
import { recordAuditEvent } from "@/server/audit";
import { propertyHasRecords } from "@/server/compliance/commands";
import { db } from "@/server/db";
import { isUuid } from "@/lib/ids";

// Mutations scoped to the owner. A property that is missing or belongs to someone else
// returns null (or false), and callers show the same "not found" response for both.

function toRow(input: PropertyInput) {
  return { ...input, leaseStartDate: input.leaseStartDate ? parseCalendarDate(input.leaseStartDate) : null };
}

function audit(userId: string, propertyId: string, action: Parameters<typeof recordAuditEvent>[0]["action"], metadata = {}) {
  return { userId, resourceType: "property", resourceId: propertyId, action, metadata };
}

export async function createProperty(userId: string, input: PropertyInput) {
  return db.$transaction(async (tx) => {
    const property = await tx.property.create({ data: { ...toRow(input), userId } });
    await recordAuditEvent(audit(userId, property.id, "property.created"), tx);
    return property;
  });
}

export async function updateProperty(userId: string, propertyId: string, input: PropertyInput) {
  if (!isUuid(propertyId)) return null;
  return db.$transaction(async (tx) => {
    const before = await tx.property.findFirst({ where: { id: propertyId, userId } });
    if (!before) return null;

    const row = toRow(input);
    const changedFields = (Object.keys(row) as (keyof typeof row)[]).filter((field) => {
      const previous = before[field];
      const next = row[field];
      return previous instanceof Date || next instanceof Date
        ? previous?.valueOf() !== next?.valueOf()
        : previous !== next;
    });
    if (changedFields.length === 0) return before;

    const property = await tx.property.update({ where: { id: before.id }, data: row });
    await recordAuditEvent(audit(userId, property.id, "property.updated", { changedFields }), tx);
    return property;
  });
}

async function setArchived(userId: string, propertyId: string, archived: boolean) {
  if (!isUuid(propertyId)) return false;
  return db.$transaction(async (tx) => {
    const { count } = await tx.property.updateMany({
      where: { id: propertyId, userId, archivedAt: archived ? null : { not: null } },
      data: { archivedAt: archived ? new Date() : null },
    });
    if (count === 0) {
      // Already in the requested state counts as success; someone else's property does not.
      return (await tx.property.count({ where: { id: propertyId, userId } })) > 0;
    }
    await recordAuditEvent(audit(userId, propertyId, archived ? "property.archived" : "property.restored"), tx);
    return true;
  });
}

export const archiveProperty = (userId: string, propertyId: string) => setArchived(userId, propertyId, true);
export const restoreProperty = (userId: string, propertyId: string) => setArchived(userId, propertyId, false);

// A property with compliance history can only be archived, so its records are never lost.
export async function deleteProperty(userId: string, propertyId: string): Promise<"deleted" | "not_found" | "has_history"> {
  if (!isUuid(propertyId)) return "not_found";
  return db.$transaction(async (tx) => {
    const owned = await tx.property.findFirst({ where: { id: propertyId, userId }, select: { id: true } });
    if (!owned) return "not_found";
    if (await propertyHasRecords(owned.id, tx)) return "has_history";
    await tx.property.delete({ where: { id: owned.id } });
    await recordAuditEvent(audit(userId, owned.id, "property.deleted"), tx);
    return "deleted";
  });
}
