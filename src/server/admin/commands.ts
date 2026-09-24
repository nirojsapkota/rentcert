import "server-only";
import type { Role } from "@/generated/prisma/client";
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

export type RoleChange = "ok" | "not_found" | "self";

// Admins cannot change their own role, so at least one admin always remains.
export async function setUserRole(adminId: string, userId: string, role: Role): Promise<RoleChange> {
  if (userId === adminId) return "self";
  return db.$transaction(async (tx) => {
    const before = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!before) return "not_found";
    if (before.role === role) return "ok";
    await tx.user.update({ where: { id: userId }, data: { role } });
    await recordAuditEvent(
      { userId: adminId, resourceType: "user", resourceId: userId, action: "admin.role_changed", metadata: { from: before.role, to: role } },
      tx,
    );
    return "ok";
  });
}
