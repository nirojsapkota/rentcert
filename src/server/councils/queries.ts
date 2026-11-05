import "server-only";
import { isUuid } from "@/lib/ids";
import { db } from "@/server/db";

export async function listCouncils() {
  return db.council.findMany({ orderBy: { name: "asc" } });
}

export async function listCouncilOptions() {
  return db.council.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}

export async function getCouncil(councilId: string) {
  if (!isUuid(councilId)) return null;
  return db.council.findUnique({ where: { id: councilId } });
}

export async function councilExists(councilId: string): Promise<boolean> {
  if (!isUuid(councilId)) return false;
  return (await db.council.count({ where: { id: councilId } })) > 0;
}
