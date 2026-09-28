import "server-only";
import { db } from "@/server/db";

export async function getSharingOverview(userId: string, now: Date = new Date()) {
  const [collaborators, invites, sharedWithMe] = await Promise.all([
    db.accountCollaborator.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, member: { select: { id: true, firstName: true, lastName: true, email: true } } },
    }),
    db.sharingInvite.findMany({
      where: { ownerId: userId, acceptedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, expiresAt: true },
    }),
    db.accountCollaborator.findMany({
      where: { memberId: userId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, owner: { select: { id: true, firstName: true, lastName: true } } },
    }),
  ]);
  return { collaborators, invites, sharedWithMe };
}

export async function isCollaborator(ownerId: string, memberId: string) {
  return (await db.accountCollaborator.count({ where: { ownerId, memberId } })) > 0;
}

// People to tell when the owner closes their account.
export async function listCollaboratorsToNotify(ownerId: string) {
  const rows = await db.accountCollaborator.findMany({
    where: { ownerId },
    select: { member: { select: { email: true, firstName: true } } },
  });
  return rows.map((row) => row.member);
}

// For the account data export: who the user shares with, and whose properties they can see.
export async function listSharingForExport(userId: string) {
  const [sharesWith, sharedWithMe] = await Promise.all([
    db.accountCollaborator.findMany({ where: { ownerId: userId }, select: { createdAt: true, member: { select: { email: true } } } }),
    db.accountCollaborator.findMany({ where: { memberId: userId }, select: { createdAt: true, owner: { select: { firstName: true } } } }),
  ]);
  return {
    sharesWith: sharesWith.map((row) => ({ email: row.member.email, since: row.createdAt })),
    sharedWithMe: sharedWithMe.map((row) => ({ ownerFirstName: row.owner.firstName, since: row.createdAt })),
  };
}
