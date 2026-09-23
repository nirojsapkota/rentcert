import "server-only";
import { db } from "@/server/db";
import { getStorage } from "@/server/vault/storage";

const MIN_AGE_MS = 24 * 60 * 60 * 1000;

// Deletes stored objects that have no document row and are older than 24 hours. They come from
// failed deletes or interrupted uploads, and nothing in the app can reach them.
export async function deleteOrphanedFiles(now: Date = new Date()): Promise<number> {
  const storage = getStorage();
  let deleted = 0;
  const batch: { key: string; lastModified: Date }[] = [];

  const flush = async () => {
    const keys = batch.map((object) => object.key);
    const known = new Set(
      (await db.complianceDocument.findMany({ where: { storageKey: { in: keys } }, select: { storageKey: true } })).map(
        (row) => row.storageKey,
      ),
    );
    for (const object of batch) {
      if (known.has(object.key) || now.getTime() - object.lastModified.getTime() < MIN_AGE_MS) continue;
      await storage.delete(object.key);
      deleted++;
    }
    batch.length = 0;
  };

  for await (const object of storage.listAll()) {
    batch.push(object);
    if (batch.length === 500) await flush();
  }
  if (batch.length > 0) await flush();
  return deleted;
}
