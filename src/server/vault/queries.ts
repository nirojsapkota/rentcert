import "server-only";
import { isUuid } from "@/lib/ids";
import { db } from "@/server/db";
import { accessibleBy } from "@/server/properties/access";

// Member-scoped reads. A document is reached only through record → property the user owns or
// collaborates on. The export covers owned properties only.

export const DOCUMENTS_PAGE_SIZE = 20;

export async function findDocumentForUser(userId: string, documentId: string) {
  if (!isUuid(documentId)) return null;
  return db.complianceDocument.findFirst({
    where: { id: documentId, complianceRecord: { property: accessibleBy(userId) } },
    include: { complianceRecord: { select: { id: true, propertyId: true } } },
  });
}

export async function listDocumentsForRecord(userId: string, propertyId: string, recordId: string) {
  if (!isUuid(propertyId) || !isUuid(recordId)) return [];
  return db.complianceDocument.findMany({
    where: { complianceRecordId: recordId, complianceRecord: { propertyId, property: accessibleBy(userId) } },
    orderBy: { uploadedAt: "asc" },
  });
}

export async function countDocumentsForRecord(recordId: string) {
  return db.complianceDocument.count({ where: { complianceRecordId: recordId } });
}

export async function listDocumentsForUser(userId: string, page: number) {
  const where = { complianceRecord: { property: accessibleBy(userId) } };
  const currentPage = Math.max(page, 1);
  const [total, documents] = await db.$transaction([
    db.complianceDocument.count({ where }),
    db.complianceDocument.findMany({
      where,
      include: {
        complianceRecord: {
          select: {
            id: true,
            completedOn: true,
            requirement: { select: { name: true } },
            property: {
              select: {
                id: true,
                userId: true,
                nickname: true,
                addressLine1: true,
                addressLine2: true,
                suburb: true,
                state: true,
                postcode: true,
                user: { select: { firstName: true } },
              },
            },
          },
        },
      },
      orderBy: [{ uploadedAt: "desc" }, { id: "desc" }],
      skip: (currentPage - 1) * DOCUMENTS_PAGE_SIZE,
      take: DOCUMENTS_PAGE_SIZE,
    }),
  ]);
  return { documents, total, page: currentPage, pageCount: Math.max(1, Math.ceil(total / DOCUMENTS_PAGE_SIZE)) };
}

// Every document for a property, oldest record first (for the compliance pack).
export async function listDocumentsForProperty(userId: string, propertyId: string) {
  if (!isUuid(propertyId)) return [];
  return db.complianceDocument.findMany({
    where: { complianceRecord: { propertyId, property: accessibleBy(userId) } },
    include: { complianceRecord: { select: { completedOn: true, requirement: { select: { name: true } } } } },
    orderBy: [{ uploadedAt: "asc" }, { id: "asc" }],
  });
}

// Every document row of the user, for the account data export.
export async function listDocumentsForExport(userId: string) {
  return db.complianceDocument.findMany({
    where: { complianceRecord: { property: { userId } } },
    orderBy: { uploadedAt: "asc" },
  });
}
