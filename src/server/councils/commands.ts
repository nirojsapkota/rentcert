import "server-only";
import type { CouncilInput } from "@/lib/council";
import { isUuid } from "@/lib/ids";
import { recordAuditEvent } from "@/server/audit";
import { db } from "@/server/db";

// Admin-only edit. Saving with a source URL marks the row verified today; without one the row
// goes back to unverified. The audit metadata holds field names only.
export async function updateCouncil(adminId: string, councilId: string, input: CouncilInput): Promise<boolean> {
  if (!isUuid(councilId)) return false;
  return db.$transaction(async (tx) => {
    const before = await tx.council.findUnique({ where: { id: councilId } });
    if (!before) return false;
    const changed = (Object.keys(input) as (keyof CouncilInput)[]).filter((field) => before[field] !== input[field]);
    const verifiedAt = input.sourceUrl ? (changed.length > 0 || !before.verifiedAt ? new Date() : before.verifiedAt) : null;
    if (changed.length === 0 && verifiedAt?.getTime() === before.verifiedAt?.getTime()) return true;
    await tx.council.update({ where: { id: councilId }, data: { ...input, verifiedAt } });
    await recordAuditEvent(
      { userId: adminId, resourceType: "council", resourceId: councilId, action: "council.updated", metadata: { changedFields: changed } },
      tx,
    );
    return true;
  });
}
