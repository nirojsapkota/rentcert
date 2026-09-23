import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { track } from "@/server/analytics/track";
import { recordAuditEvent } from "@/server/audit";
import { canWrite } from "@/server/billing/entitlements";
import { findRecordForUser } from "@/server/compliance/queries";
import { db } from "@/server/db";
import {
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENTS_PER_RECORD,
  detectFileType,
  sanitizeFilename,
  type DetectedType,
} from "@/server/vault/file-type";
import { countDocumentsForRecord, findDocumentForUser } from "@/server/vault/queries";
import { scanDocument } from "@/server/vault/scan";
import { documentKey, getStorage, userPrefix } from "@/server/vault/storage";

export type UploadFile = { name: string; bytes: Uint8Array };

export type UploadResult =
  | { ok: true; documentId: string }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "invalid"; message: string };

const READ_ONLY_MESSAGE = "Your free trial has ended. Choose a plan in Billing to add documents.";

export const UPLOAD_MESSAGES = {
  empty: "Choose a file to upload.",
  tooLarge: "The file must be 10 MB or smaller.",
  wrongType: "Upload a PDF, JPG or PNG file.",
  tooMany: `A record can have at most ${MAX_DOCUMENTS_PER_RECORD} documents. Delete one before adding another.`,
  archived: "This property is archived. Restore it before adding documents.",
} as const;

// Checks that need only the file itself. Run before creating anything, so a bad file never
// leaves half-saved data behind.
export function checkFile(file: UploadFile): { ok: true; type: DetectedType } | { ok: false; message: string } {
  if (file.bytes.byteLength === 0) return { ok: false, message: UPLOAD_MESSAGES.empty };
  if (file.bytes.byteLength > MAX_DOCUMENT_BYTES) return { ok: false, message: UPLOAD_MESSAGES.tooLarge };
  const type = detectFileType(file.bytes);
  return type ? { ok: true, type } : { ok: false, message: UPLOAD_MESSAGES.wrongType };
}

export async function uploadDocument(
  userId: string,
  propertyId: string,
  recordId: string,
  file: UploadFile,
): Promise<UploadResult> {
  const record = await findRecordForUser(userId, propertyId, recordId);
  if (!record) return { ok: false, reason: "not_found" };
  if (record.property.archivedAt) return { ok: false, reason: "invalid", message: UPLOAD_MESSAGES.archived };
  if (!(await canWrite(userId))) return { ok: false, reason: "invalid", message: READ_ONLY_MESSAGE };

  const checked = checkFile(file);
  if (!checked.ok) return { ok: false, reason: "invalid", message: checked.message };
  if ((await countDocumentsForRecord(record.id)) >= MAX_DOCUMENTS_PER_RECORD) {
    return { ok: false, reason: "invalid", message: UPLOAD_MESSAGES.tooMany };
  }

  const id = randomUUID();
  const storageKey = documentKey(userId, id);
  const storage = getStorage();
  await storage.put(storageKey, file.bytes, checked.type.contentType);

  try {
    await db.$transaction(async (tx) => {
      await tx.complianceDocument.create({
        data: {
          id,
          complianceRecordId: record.id,
          filename: sanitizeFilename(file.name, checked.type.extension),
          contentType: checked.type.contentType,
          byteSize: file.bytes.byteLength,
          sha256: createHash("sha256").update(file.bytes).digest("hex"),
          storageKey,
          scanStatus: await scanDocument(file.bytes),
        },
      });
      await recordAuditEvent(
        {
          userId,
          resourceType: "compliance_document",
          resourceId: id,
          action: "document.uploaded",
          metadata: { complianceRecordId: record.id, contentType: checked.type.contentType, byteSize: file.bytes.byteLength },
        },
        tx,
      );
      await track("document_uploaded", userId, tx);
    });
  } catch (error) {
    await storage.delete(storageKey).catch(() => undefined);
    throw error;
  }
  return { ok: true, documentId: id };
}

export async function deleteDocument(
  userId: string,
  documentId: string,
): Promise<{ ok: true; propertyId: string; recordId: string } | { ok: false; reason: "not_found" }> {
  const document = await findDocumentForUser(userId, documentId);
  if (!document) return { ok: false, reason: "not_found" };

  await db.$transaction(async (tx) => {
    await tx.complianceDocument.delete({ where: { id: document.id } });
    await recordAuditEvent(
      {
        userId,
        resourceType: "compliance_document",
        resourceId: document.id,
        action: "document.deleted",
        metadata: { complianceRecordId: document.complianceRecordId, contentType: document.contentType, byteSize: document.byteSize },
      },
      tx,
    );
  });
  try {
    await getStorage().delete(document.storageKey);
  } catch (error) {
    // The row is gone, so the file is unreachable. A cleanup job can remove the orphan later.
    console.error("[vault] failed to delete stored object", error instanceof Error ? error.name : "unknown");
  }
  return { ok: true, propertyId: document.complianceRecord.propertyId, recordId: document.complianceRecordId };
}

// Called after the user row (and, by cascade, every document row) has been deleted.
export async function deleteAllDocumentsForUser(userId: string) {
  await getStorage().deletePrefix(userPrefix(userId));
}
