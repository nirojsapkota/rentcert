import "server-only";
import { z } from "zod";
import { db } from "@/server/db";

// Every query takes the signed-in user's id. Nothing here looks up a property by id alone.

export const PROPERTIES_PAGE_SIZE = 20;

export type PropertyView = "active" | "archived";

const isUuid = (value: string) => z.uuid().safeParse(value).success;

export async function findPropertyForUser(userId: string, propertyId: string) {
  if (!isUuid(propertyId)) return null;
  return db.property.findFirst({ where: { id: propertyId, userId } });
}

export async function listPropertiesForUser(userId: string, { view, page }: { view: PropertyView; page: number }) {
  const where = { userId, archivedAt: view === "archived" ? { not: null } : null };
  const [total, items] = await db.$transaction([
    db.property.count({ where }),
    db.property.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (Math.max(page, 1) - 1) * PROPERTIES_PAGE_SIZE,
      take: PROPERTIES_PAGE_SIZE,
    }),
  ]);
  return { items, total, page: Math.max(page, 1), pageCount: Math.max(1, Math.ceil(total / PROPERTIES_PAGE_SIZE)) };
}

export async function countActiveProperties(userId: string) {
  return db.property.count({ where: { userId, archivedAt: null } });
}

export { isUuid };
