import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

export type AuditAction =
  | "user.created"
  | "user.updated"
  | "user.email_verified"
  | "user.password_reset"
  | "property.created"
  | "property.updated"
  | "property.archived"
  | "property.restored"
  | "property.deleted"
  | "property.checks_set_up"
  | "property.requirement_excluded"
  | "property.requirement_included"
  | "property.transferred"
  | "compliance_record.created"
  | "compliance_record.updated"
  | "document.uploaded"
  | "document.deleted"
  | "compliance_pack.generated"
  | "billing.checkout_started"
  | "billing.subscription_changed"
  | "admin.viewed"
  | "admin.requirement_updated"
  | "admin.requirement_verified"
  | "admin.setting_updated"
  | "admin.role_changed"
  | "account.exported"
  | "sharing.invite_sent"
  | "sharing.invite_revoked"
  | "sharing.invite_accepted"
  | "sharing.collaborator_removed"
  | "sharing.collaborator_left";

type AuditInput = {
  userId: string;
  resourceType: string;
  resourceId: string;
  action: AuditAction;
  // Field names and non-sensitive values only. Never document contents, tokens or passwords.
  metadata?: Prisma.InputJsonObject;
};

export async function recordAuditEvent(input: AuditInput, client: Prisma.TransactionClient = db) {
  await client.auditEvent.create({
    data: {
      userId: input.userId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      action: input.action,
      metadata: input.metadata ?? {},
    },
  });
}
