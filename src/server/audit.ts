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
  | "property.deleted";

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
