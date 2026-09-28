import "server-only";
import { isUuid } from "@/lib/ids";
import { recordAuditEvent } from "@/server/audit";
import { hasPropertySlot } from "@/server/billing/entitlements";
import { db } from "@/server/db";
import { reportError } from "@/server/observability";
import { isCollaborator } from "@/server/sharing/queries";
import { moveDocumentsToOwner } from "@/server/vault/commands";

export type TransferResult = "transferred" | "not_found" | "no_slot";

// Moves one property to one of the owner's collaborators. The new owner needs room on their plan
// for an active property. The old owner and their other collaborators lose access, unless the new
// owner shares with them. Files follow the property to the new owner's storage prefix.
export async function transferProperty(ownerId: string, propertyId: string, newOwnerId: string): Promise<TransferResult> {
  if (!isUuid(propertyId) || newOwnerId === ownerId || !(await isCollaborator(ownerId, newOwnerId))) return "not_found";

  const result = await db.$transaction(async (tx) => {
    const property = await tx.property.findFirst({ where: { id: propertyId, userId: ownerId }, select: { archivedAt: true } });
    if (!property) return "not_found" as const;
    if (
      property.archivedAt === null &&
      !(await hasPropertySlot(tx, newOwnerId, () => tx.property.count({ where: { userId: newOwnerId, archivedAt: null } })))
    ) {
      return "no_slot" as const;
    }
    const { count } = await tx.property.updateMany({ where: { id: propertyId, userId: ownerId }, data: { userId: newOwnerId } });
    if (count === 0) return "not_found" as const;
    await recordAuditEvent(
      { userId: ownerId, resourceType: "property", resourceId: propertyId, action: "property.transferred", metadata: { toUserId: newOwnerId } },
      tx,
    );
    await recordAuditEvent(
      { userId: newOwnerId, resourceType: "property", resourceId: propertyId, action: "property.transferred", metadata: { fromUserId: ownerId } },
      tx,
    );
    return "transferred" as const;
  });

  if (result === "transferred") {
    // A failure here leaves files readable under the old prefix. Account deletion moves any such
    // file before deleting that prefix, so nothing is lost.
    await moveDocumentsToOwner({ propertyId }).catch((error) => reportError("properties", "could not move files after transfer", error));
  }
  return result;
}
