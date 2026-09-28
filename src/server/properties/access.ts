import "server-only";
import type { Prisma } from "@/generated/prisma/client";

// The only definition of who may work on a property: its owner, or a collaborator the owner
// shares their account with. Owner-only actions (edit, archive, delete, transfer, sharing) filter
// by `userId` directly instead.
export function accessibleBy(userId: string): Prisma.PropertyWhereInput {
  return { OR: [{ userId }, { user: { collaborators: { some: { memberId: userId } } } }] };
}

export type PropertyRole = "OWNER" | "COLLABORATOR";

export function roleFor(userId: string, property: { userId: string }): PropertyRole {
  return property.userId === userId ? "OWNER" : "COLLABORATOR";
}
