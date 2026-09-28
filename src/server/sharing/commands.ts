import "server-only";
import { isUuid } from "@/lib/ids";
import { recordAuditEvent } from "@/server/audit";
import { db } from "@/server/db";
import { appUrl } from "@/server/mail/app-url";
import { sendSharingInviteEmail } from "@/server/mail/messages";
import { hashInviteToken, isInviteToken, newInviteToken } from "@/server/sharing/tokens";

// Account-level sharing. Only the owner invites and removes; a collaborator can only leave.
// Audit metadata holds ids, never emails or tokens.

export const MAX_COLLABORATORS = 5; // collaborators plus pending invites, per owner
export const MAX_INVITES_PER_DAY = 10; // invite emails per owner in any 24 hours, re-sends included
export const INVITE_DAYS = 7;

export const SHARING_MESSAGES = {
  self: "You can't invite yourself.",
  alreadyShared: "That person already has access to your properties.",
  tooMany: `You can share with up to ${MAX_COLLABORATORS} people. Remove someone or revoke an invite first.`,
  dailyLimit: "You've sent as many invites as allowed today. Try again tomorrow.",
} as const;

type Owner = { id: string; email: string; firstName: string };

export async function inviteCollaborator(owner: Owner, rawEmail: string, now: Date = new Date()): Promise<{ ok: true } | { ok: false; message: string }> {
  const email = rawEmail.trim().toLowerCase();
  if (email === owner.email.toLowerCase()) return { ok: false, message: SHARING_MESSAGES.self };

  const { token, tokenHash } = newInviteToken();
  const result = await db.$transaction(async (tx) => {
    // Serialises invites from one owner, so parallel requests cannot pass the limits together.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`sharing:${owner.id}`}))`;

    const existing = await tx.accountCollaborator.count({ where: { ownerId: owner.id, member: { email } } });
    if (existing > 0) return { ok: false as const, message: SHARING_MESSAGES.alreadyShared };

    const [collaborators, pending, sentToday] = await Promise.all([
      tx.accountCollaborator.count({ where: { ownerId: owner.id } }),
      tx.sharingInvite.count({ where: { ownerId: owner.id, acceptedAt: null, expiresAt: { gt: now }, email: { not: email } } }),
      tx.auditEvent.count({ where: { userId: owner.id, action: "sharing.invite_sent", createdAt: { gt: new Date(now.getTime() - 24 * 3600 * 1000) } } }),
    ]);
    if (collaborators + pending >= MAX_COLLABORATORS) return { ok: false as const, message: SHARING_MESSAGES.tooMany };
    if (sentToday >= MAX_INVITES_PER_DAY) return { ok: false as const, message: SHARING_MESSAGES.dailyLimit };

    const expiresAt = new Date(now.getTime() + INVITE_DAYS * 24 * 3600 * 1000);
    // Re-inviting the same email replaces the old invite, so its link stops working.
    const invite = await tx.sharingInvite.upsert({
      where: { ownerId_email: { ownerId: owner.id, email } },
      create: { ownerId: owner.id, email, tokenHash, expiresAt },
      update: { tokenHash, expiresAt, acceptedAt: null, createdAt: now },
    });
    await recordAuditEvent({ userId: owner.id, resourceType: "sharing_invite", resourceId: invite.id, action: "sharing.invite_sent" }, tx);
    return { ok: true as const };
  });
  if (!result.ok) return result;

  await sendSharingInviteEmail(email, owner.firstName, appUrl(`/invites/${token}`));
  return result;
}

export async function revokeInvite(ownerId: string, inviteId: string): Promise<boolean> {
  if (!isUuid(inviteId)) return false;
  return db.$transaction(async (tx) => {
    const { count } = await tx.sharingInvite.deleteMany({ where: { id: inviteId, ownerId, acceptedAt: null } });
    if (count === 0) return false;
    await recordAuditEvent({ userId: ownerId, resourceType: "sharing_invite", resourceId: inviteId, action: "sharing.invite_revoked" }, tx);
    return true;
  });
}

export async function removeCollaborator(ownerId: string, memberId: string): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const { count } = await tx.accountCollaborator.deleteMany({ where: { ownerId, memberId } });
    if (count === 0) return false;
    await recordAuditEvent(
      { userId: ownerId, resourceType: "user", resourceId: memberId, action: "sharing.collaborator_removed" },
      tx,
    );
    return true;
  });
}

export async function leaveSharedAccount(memberId: string, ownerId: string): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const { count } = await tx.accountCollaborator.deleteMany({ where: { ownerId, memberId } });
    if (count === 0) return false;
    await recordAuditEvent({ userId: memberId, resourceType: "user", resourceId: ownerId, action: "sharing.collaborator_left" }, tx);
    return true;
  });
}

// A usable invite: exists, not accepted, not expired. Revoked invites no longer exist.
async function findUsableInvite(token: string, now: Date) {
  if (!isInviteToken(token)) return null;
  const invite = await db.sharingInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: { owner: { select: { firstName: true } } },
  });
  if (!invite || invite.acceptedAt || invite.expiresAt <= now) return null;
  return invite;
}

// For the invite page. Every unusable case returns null, so the page cannot tell them apart.
export async function findInvite(token: string, now: Date = new Date()) {
  const invite = await findUsableInvite(token, now);
  return invite ? { ownerId: invite.ownerId, ownerFirstName: invite.owner.firstName, email: invite.email } : null;
}

type Accepter = { id: string; email: string; emailVerified: boolean };

export async function acceptInvite(
  user: Accepter,
  token: string,
  now: Date = new Date(),
): Promise<{ ok: true; ownerId: string } | { ok: false; reason: "invalid" | "wrong_email" }> {
  const invite = await findUsableInvite(token, now);
  if (!invite || invite.ownerId === user.id) return { ok: false, reason: "invalid" };
  if (!user.emailVerified || invite.email !== user.email.toLowerCase()) return { ok: false, reason: "wrong_email" };

  return db.$transaction(async (tx) => {
    // Single use: only the first acceptance flips acceptedAt.
    const { count } = await tx.sharingInvite.updateMany({ where: { id: invite.id, acceptedAt: null }, data: { acceptedAt: now } });
    if (count === 0) return { ok: false as const, reason: "invalid" as const };
    await tx.accountCollaborator.createMany({ data: [{ ownerId: invite.ownerId, memberId: user.id }], skipDuplicates: true });
    await recordAuditEvent(
      { userId: user.id, resourceType: "user", resourceId: invite.ownerId, action: "sharing.invite_accepted" },
      tx,
    );
    return { ok: true as const, ownerId: invite.ownerId };
  });
}
