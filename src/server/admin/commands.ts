import "server-only";
import { recordAuditEvent } from "@/server/audit";
import { db } from "@/server/db";

// Admin changes. Every one is audited with the admin's user id.

export type RequirementEdit = {
  name: string;
  description: string;
  recurrenceMonths: number;
  sourceName: string | null;
  sourceUrl: string | null;
  active: boolean;
};

export async function updateRequirement(adminId: string, requirementId: string, input: RequirementEdit) {
  return db.$transaction(async (tx) => {
    const before = await tx.complianceRequirement.findUnique({ where: { id: requirementId } });
    if (!before) return false;
    const changedFields = (Object.keys(input) as (keyof RequirementEdit)[]).filter((field) => before[field] !== input[field]);
    if (changedFields.length === 0) return true;
    await tx.complianceRequirement.update({ where: { id: requirementId }, data: input });
    await recordAuditEvent(
      {
        userId: adminId,
        resourceType: "compliance_requirement",
        resourceId: requirementId,
        action: "admin.requirement_updated",
        metadata: Object.fromEntries(changedFields.map((field) => [field, { from: before[field], to: input[field] }])),
      },
      tx,
    );
    return true;
  });
}

// Records that a person checked this requirement against current official sources today.
export async function markRequirementVerified(adminId: string, requirementId: string) {
  return db.$transaction(async (tx) => {
    const { count } = await tx.complianceRequirement.updateMany({ where: { id: requirementId }, data: { lastVerifiedAt: new Date() } });
    if (count === 0) return false;
    await recordAuditEvent(
      { userId: adminId, resourceType: "compliance_requirement", resourceId: requirementId, action: "admin.requirement_verified" },
      tx,
    );
    return true;
  });
}

export async function setTrialDays(adminId: string, days: number) {
  await db.$transaction(async (tx) => {
    const before = await tx.appSetting.findUnique({ where: { key: "trial_days" } });
    await tx.appSetting.upsert({ where: { key: "trial_days" }, create: { key: "trial_days", value: days }, update: { value: days } });
    await recordAuditEvent(
      { userId: adminId, resourceType: "app_setting", resourceId: "trial_days", action: "admin.setting_updated", metadata: { from: before?.value ?? null, to: days } },
      tx,
    );
  });
}

export async function recordAdminView(adminId: string, page: string) {
  await recordAuditEvent({ userId: adminId, resourceType: "admin_page", resourceId: page, action: "admin.viewed" });
}
