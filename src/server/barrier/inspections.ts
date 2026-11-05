import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { addDays, parseCalendarDate } from "@/lib/calendar-date";
import { isUuid } from "@/lib/ids";
import { MAX_PHOTOS_PER_INSPECTION, MAX_PHOTO_BYTES, type InspectionInput } from "@/lib/inspection-validation";
import { recordAuditEvent } from "@/server/audit";
import { db } from "@/server/db";
import { reportError } from "@/server/observability";
import { sanitizeFilename } from "@/server/vault/file-type";
import { documentKey, getStorage } from "@/server/vault/storage";
import { detectPhotoType } from "./photo-type";
import { nextRecallDate } from "./recall-date";

// Inspections are scoped to the inspector who owns them. Missing and someone else's both return
// null (or false). Inspections are edited, never deleted.

export const PHOTO_MESSAGES = {
  empty: "Choose a photo to upload.",
  tooLarge: "The photo must be 8 MB or smaller.",
  wrongType: "Upload a JPG, PNG or WebP photo.",
  tooMany: `An inspection can have at most ${MAX_PHOTOS_PER_INSPECTION} photos. Delete one before adding another.`,
  caption: "The caption must be 200 characters or fewer.",
} as const;

function toRow(input: InspectionInput) {
  return {
    kind: input.kind,
    outcome: input.outcome,
    inspectedOn: parseCalendarDate(input.inspectedOn)!,
    certificateNumber: input.certificateNumber,
    lodgedOn: input.lodgedOn ? parseCalendarDate(input.lodgedOn) : null,
    notes: input.notes,
    nextRecallOn: ((due) => (due ? parseCalendarDate(due) : null))(nextRecallDate(input.outcome, input.inspectedOn)),
  };
}

const same = (a: unknown, b: unknown) => (a instanceof Date || b instanceof Date ? (a as Date | null)?.valueOf() === (b as Date | null)?.valueOf() : a === b);

// Returns null when the pool is missing, someone else's, or archived.
export async function createInspection(userId: string, poolId: string, input: InspectionInput) {
  if (!isUuid(poolId)) return null;
  return db.$transaction(async (tx) => {
    const pool = await tx.pool.findFirst({ where: { id: poolId, userId, archivedAt: null }, select: { id: true } });
    if (!pool) return null;
    const inspection = await tx.inspection.create({ data: { ...toRow(input), userId, poolId } });
    await recordAuditEvent({ userId, resourceType: "inspection", resourceId: inspection.id, action: "inspection.created", metadata: { outcome: input.outcome } }, tx);
    return inspection;
  });
}

export async function updateInspection(userId: string, inspectionId: string, input: InspectionInput) {
  if (!isUuid(inspectionId)) return null;
  return db.$transaction(async (tx) => {
    const before = await tx.inspection.findFirst({ where: { id: inspectionId, userId } });
    if (!before) return null;
    const row = toRow(input);
    const changedFields = (Object.keys(row) as (keyof typeof row)[]).filter((field) => !same(before[field], row[field]));
    if (changedFields.length === 0) return before;
    const inspection = await tx.inspection.update({ where: { id: before.id }, data: row });
    await recordAuditEvent({ userId, resourceType: "inspection", resourceId: inspection.id, action: "inspection.updated", metadata: { changedFields } }, tx);
    return inspection;
  });
}

export type PhotoResult =
  | { ok: true; photoId: string }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "invalid"; message: string };

export async function uploadInspectionPhoto(
  userId: string,
  inspectionId: string,
  file: { name: string; bytes: Uint8Array },
  caption: string | null,
): Promise<PhotoResult> {
  if (!isUuid(inspectionId)) return { ok: false, reason: "not_found" };
  const inspection = await db.inspection.findFirst({ where: { id: inspectionId, userId }, select: { id: true } });
  if (!inspection) return { ok: false, reason: "not_found" };

  if (file.bytes.byteLength === 0) return { ok: false, reason: "invalid", message: PHOTO_MESSAGES.empty };
  if (file.bytes.byteLength > MAX_PHOTO_BYTES) return { ok: false, reason: "invalid", message: PHOTO_MESSAGES.tooLarge };
  const type = detectPhotoType(file.bytes);
  if (!type) return { ok: false, reason: "invalid", message: PHOTO_MESSAGES.wrongType };
  if (caption && caption.length > 200) return { ok: false, reason: "invalid", message: PHOTO_MESSAGES.caption };

  const id = randomUUID();
  // Same key shape as vault documents, so the storage drivers and account deletion cover photos.
  const storageKey = documentKey(userId, id);
  const storage = getStorage();
  await storage.put(storageKey, file.bytes, type.contentType);

  try {
    const result = await db.$transaction(async (tx) => {
      // Serialises concurrent uploads so the limit holds.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${inspectionId}))`;
      if ((await tx.inspectionPhoto.count({ where: { inspectionId } })) >= MAX_PHOTOS_PER_INSPECTION) return false;
      await tx.inspectionPhoto.create({
        data: {
          id,
          userId,
          inspectionId,
          storageKey,
          filename: sanitizeFilename(file.name, type.extension),
          contentType: type.contentType,
          byteSize: file.bytes.byteLength,
          caption,
        },
      });
      await recordAuditEvent(
        { userId, resourceType: "inspection_photo", resourceId: id, action: "inspection_photo.uploaded", metadata: { inspectionId, contentType: type.contentType, byteSize: file.bytes.byteLength, sha256: createHash("sha256").update(file.bytes).digest("hex") } },
        tx,
      );
      return true;
    });
    if (!result) {
      await storage.delete(storageKey).catch(() => undefined);
      return { ok: false, reason: "invalid", message: PHOTO_MESSAGES.tooMany };
    }
  } catch (error) {
    await storage.delete(storageKey).catch(() => undefined);
    throw error;
  }
  return { ok: true, photoId: id };
}

export async function deleteInspectionPhoto(userId: string, photoId: string) {
  if (!isUuid(photoId)) return null;
  const photo = await db.inspectionPhoto.findFirst({ where: { id: photoId, userId }, include: { inspection: { select: { poolId: true } } } });
  if (!photo) return null;
  await db.$transaction(async (tx) => {
    await tx.inspectionPhoto.delete({ where: { id: photo.id } });
    await recordAuditEvent({ userId, resourceType: "inspection_photo", resourceId: photo.id, action: "inspection_photo.deleted", metadata: { inspectionId: photo.inspectionId } }, tx);
  });
  try {
    await getStorage().delete(photo.storageKey);
  } catch (error) {
    // The row is gone; the orphan cleanup job removes the file later.
    reportError("barrier", "failed to delete stored photo", error);
  }
  return { inspectionId: photo.inspectionId, poolId: photo.inspection.poolId };
}

export async function getInspection(userId: string, inspectionId: string) {
  if (!isUuid(inspectionId)) return null;
  return db.inspection.findFirst({
    where: { id: inspectionId, userId },
    include: { pool: { select: { id: true, addressLine1: true, addressLine2: true, suburb: true, postcode: true, archivedAt: true, council: true } }, photos: { orderBy: { uploadedAt: "asc" } } },
  });
}

export async function listInspectionsForPool(userId: string, poolId: string) {
  if (!isUuid(poolId)) return [];
  return db.inspection.findMany({ where: { poolId, userId }, orderBy: [{ inspectedOn: "desc" }, { createdAt: "desc" }], include: { _count: { select: { photos: true } } } });
}

export async function findPhotoForUser(userId: string, photoId: string) {
  if (!isUuid(photoId)) return null;
  return db.inspectionPhoto.findFirst({ where: { id: photoId, userId } });
}

// Recalls due from today up to `days` days ahead, counting only each pool's current inspection
// (its latest pass) and only active pools.
export async function countRecallsDue(userId: string, today: string, days: number) {
  const until = parseCalendarDate(addDays(today, days))!;
  const rows = await db.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) AS count FROM (
      SELECT DISTINCT ON (i.pool_id) i.next_recall_on
      FROM inspections i JOIN pools p ON p.id = i.pool_id
      WHERE i.user_id = ${userId} AND p.archived_at IS NULL AND i.outcome = 'PASS'
      ORDER BY i.pool_id, i.inspected_on DESC, i.created_at DESC
    ) latest
    WHERE latest.next_recall_on <= ${until}`;
  return Number(rows[0]?.count ?? 0);
}

export async function knownPhotoKeys(keys: string[]): Promise<Set<string>> {
  const rows = await db.inspectionPhoto.findMany({ where: { storageKey: { in: keys } }, select: { storageKey: true } });
  return new Set(rows.map((row) => row.storageKey));
}

export async function listInspectionsForExport(userId: string) {
  const [inspections, photos] = await Promise.all([
    db.inspection.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, omit: { userId: true } }),
    db.inspectionPhoto.findMany({ where: { userId }, orderBy: { uploadedAt: "asc" }, omit: { userId: true } }),
  ]);
  return { inspections, photos };
}
