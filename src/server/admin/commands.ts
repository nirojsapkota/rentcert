import "server-only";
import { Prisma, type RequirementBasis, type Role } from "@/generated/prisma/client";
import { isUuid } from "@/lib/ids";
import { recordAuditEvent } from "@/server/audit";
import { db } from "@/server/db";

// Admin changes. Every one is audited with the admin's user id.

export type RequirementEdit = {
  name: string;
  description: string;
  recurrenceMonths: number;
  basis: RequirementBasis;
  sourceName: string | null;
  sourceUrl: string | null;
  active: boolean;
};

export type NewRequirement = RequirementEdit & { jurisdiction: string; code: string };

// Adds a requirement to a state's schedule. It starts unverified. A code already used in that
// state is refused; reusing a code from another state keeps records and exclusions attached.
export async function createRequirement(adminId: string, input: NewRequirement): Promise<"created" | "duplicate"> {
  try {
    return await db.$transaction(async (tx) => {
      const last = await tx.complianceRequirement.aggregate({ where: { jurisdiction: input.jurisdiction }, _max: { sortOrder: true } });
      const created = await tx.complianceRequirement.create({ data: { ...input, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
      await recordAuditEvent(
        {
          userId: adminId,
          resourceType: "compliance_requirement",
          resourceId: created.id,
          action: "admin.requirement_created",
          metadata: { jurisdiction: input.jurisdiction, code: input.code, recurrenceMonths: input.recurrenceMonths, basis: input.basis },
        },
        tx,
      );
      return "created" as const;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "duplicate";
    throw error;
  }
}

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
// Returns the requirement's jurisdiction, or null when it does not exist.
export async function markRequirementVerified(adminId: string, requirementId: string): Promise<string | null> {
  if (!isUuid(requirementId)) return null;
  return db.$transaction(async (tx) => {
    const requirement = await tx.complianceRequirement.findUnique({ where: { id: requirementId }, select: { jurisdiction: true } });
    if (!requirement) return null;
    await tx.complianceRequirement.update({ where: { id: requirementId }, data: { lastVerifiedAt: new Date() } });
    await recordAuditEvent(
      { userId: adminId, resourceType: "compliance_requirement", resourceId: requirementId, action: "admin.requirement_verified" },
      tx,
    );
    return requirement.jurisdiction;
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
