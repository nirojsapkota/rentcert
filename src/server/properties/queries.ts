import "server-only";
import { isUuid } from "@/lib/ids";
import { db } from "@/server/db";
import { accessibleBy } from "@/server/properties/access";

// Every query takes the signed-in user's id. Nothing here looks up a property by id alone.
// Reads include properties shared with the user; counts and exports cover owned properties only.

export const PROPERTIES_PAGE_SIZE = 20;

export type PropertyView = "active" | "archived";

const ownerName = { user: { select: { firstName: true } } } as const;

// A property the user owns or collaborates on.
export async function findPropertyForUser(userId: string, propertyId: string) {
  if (!isUuid(propertyId)) return null;
  return db.property.findFirst({ where: { id: propertyId, ...accessibleBy(userId) }, include: ownerName });
}

// A property the user owns. For owner-only pages and actions.
export async function findOwnedProperty(userId: string, propertyId: string) {
  if (!isUuid(propertyId)) return null;
  return db.property.findFirst({ where: { id: propertyId, userId } });
}

export async function listPropertiesForUser(userId: string, { view, page }: { view: PropertyView; page: number }) {
  const where = { ...accessibleBy(userId), archivedAt: view === "archived" ? { not: null } : null };
  const [total, items] = await db.$transaction([
    db.property.count({ where }),
    db.property.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (Math.max(page, 1) - 1) * PROPERTIES_PAGE_SIZE,
      take: PROPERTIES_PAGE_SIZE,
      include: ownerName,
    }),
  ]);
  return { items, total, page: Math.max(page, 1), pageCount: Math.max(1, Math.ceil(total / PROPERTIES_PAGE_SIZE)) };
}

export async function countActiveProperties(userId: string) {
  return db.property.count({ where: { userId, archivedAt: null } });
}

// Owned properties, active and archived (for the account deletion warning).
export async function countOwnedProperties(userId: string) {
  return db.property.count({ where: { userId } });
}

// Active properties for dashboard summaries, owned and shared, newest first.
export async function listActivePropertiesForUser(userId: string) {
  return db.property.findMany({
    where: { ...accessibleBy(userId), archivedAt: null },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, userId: true, nickname: true, addressLine1: true, addressLine2: true, suburb: true, state: true, postcode: true, ...ownerName },
  });
}

// Every property of the user, for the account data export.
export async function listPropertiesForExport(userId: string) {
  return db.property.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
}
