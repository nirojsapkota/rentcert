import "server-only";
import { Zip, ZipDeflate, ZipPassThrough } from "fflate";
import { recordAuditEvent } from "@/server/audit";
import { db } from "@/server/db";
import { listComplianceForExport } from "@/server/compliance/queries";
import { listPropertiesForExport } from "@/server/properties/queries";
import { listRemindersForExport } from "@/server/reminders/queries";
import { listDocumentsForExport } from "@/server/vault/queries";
import { getStorage } from "@/server/vault/storage";

const encoder = new TextEncoder();

// Everything RentCert holds about one user, as a ZIP stream: JSON files plus the original documents.
export async function exportAccountData(userId: string): Promise<ReadableStream<Uint8Array>> {
  const [user, properties, compliance, reminders, documents, auditEvents] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true, timezone: true, notificationEmail: true, reminderEmailsEnabled: true, createdAt: true, trialEndsAt: true },
    }),
    listPropertiesForExport(userId),
    listComplianceForExport(userId),
    listRemindersForExport(userId),
    listDocumentsForExport(userId),
    db.auditEvent.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, select: { action: true, resourceType: true, resourceId: true, metadata: true, createdAt: true } }),
  ]);
  await recordAuditEvent({ userId, resourceType: "user", resourceId: userId, action: "account.exported" });

  const storage = getStorage();
  const usedNames = new Set<string>();
  const documentPath = (id: string, filename: string) => {
    const name = usedNames.has(filename) ? `${id.slice(0, 8)}-${filename}` : filename;
    usedNames.add(name);
    return `documents/${name}`;
  };

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const zip = new Zip((error, chunk, final) => {
        if (error) return controller.error(error);
        controller.enqueue(chunk);
        if (final) controller.close();
      });
      const addJson = (name: string, value: unknown) => {
        const file = new ZipDeflate(name, { level: 6 });
        zip.add(file);
        file.push(encoder.encode(JSON.stringify(value, null, 2)), true);
      };

      addJson("account.json", user);
      addJson("properties.json", properties.map(({ userId: _owner, ...property }) => property));
      addJson("compliance-records.json", compliance.records);
      addJson("not-applicable.json", compliance.exclusions);
      addJson("reminders.json", reminders);
      addJson(
        "documents.json",
        documents.map(({ storageKey: _key, ...document }) => ({ ...document, file: documentPath(document.id, document.filename) })),
      );
      addJson("audit-events.json", auditEvents);

      usedNames.clear();
      for (const document of documents) {
        // Files are already compressed (PDF, JPEG, PNG), so store them as-is.
        const file = new ZipPassThrough(documentPath(document.id, document.filename));
        zip.add(file);
        file.push(await storage.read(document.storageKey), true);
      }
      zip.end();
    },
  });
}
