import "server-only";
import { fullName, type ProfileInput } from "@/lib/account-validation";
import { recordAuditEvent } from "@/server/audit";
import { db } from "@/server/db";

export async function findProfile(userId: string) {
  return db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, firstName: true, lastName: true, timezone: true, notificationEmail: true, reminderEmailsEnabled: true },
  });
}

// Updates the signed-in user's own profile and records which fields changed.
export async function updateProfile(userId: string, input: ProfileInput) {
  await db.$transaction(async (tx) => {
    const before = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { firstName: true, lastName: true, timezone: true, notificationEmail: true, reminderEmailsEnabled: true },
    });

    const changedFields = (Object.keys(input) as (keyof ProfileInput)[]).filter(
      (field) => before[field] !== input[field],
    );
    if (changedFields.length === 0) return;

    await tx.user.update({
      where: { id: userId },
      data: { ...input, name: fullName(input.firstName, input.lastName) },
    });
    await recordAuditEvent(
      { userId, resourceType: "user", resourceId: userId, action: "user.updated", metadata: { changedFields } },
      tx,
    );
  });
}
