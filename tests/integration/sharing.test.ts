import { existsSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as download } from "@/app/api/documents/[id]/download/route";
import { GET as downloadPack } from "@/app/api/properties/[id]/compliance-pack/route";
import { addDays, todayIn } from "@/lib/calendar-date";
import { inviteReturnPath } from "@/lib/invite-link";
import { recordCompletion, setRequirementApplicable, updateRecord } from "@/server/compliance/commands";
import { getDashboard, getPropertySchedule, listPropertyHistory } from "@/server/compliance/queries";
import { db } from "@/server/db";
import { testOutbox } from "@/server/mail/deliver";
import { archiveProperty, deleteProperty, updateProperty } from "@/server/properties/commands";
import { findPropertyForUser, listPropertiesForExport, listPropertiesForUser } from "@/server/properties/queries";
import { transferProperty } from "@/server/properties/transfer";
import { scanDueReminders } from "@/server/reminders/scan";
import { sendReminder } from "@/server/reminders/send";
import {
  MAX_COLLABORATORS,
  MAX_INVITES_PER_DAY,
  SHARING_MESSAGES,
  acceptInvite,
  findInvite,
  inviteCollaborator,
  leaveSharedAccount,
  removeCollaborator,
  revokeInvite,
} from "@/server/sharing/commands";
import { listSharingForExport } from "@/server/sharing/queries";
import { hashInviteToken } from "@/server/sharing/tokens";
import { uploadDocument } from "@/server/vault/commands";
import { listDocumentsForUser } from "@/server/vault/queries";
import { getStorage } from "@/server/vault/storage";
import { callAuth, createVerifiedUser, VALID_PASSWORD } from "../support/auth-http";
import { createUser, insertProperty, propertyInput, subscribe } from "../support/factories";
import { pdfBytes } from "../support/files";

const STORAGE_ROOT = path.resolve("tmp/test-storage");
const T = todayIn("Australia/Melbourne");
const NOW = new Date(`${T}T00:00:00Z`); // 10:00 or 11:00 in Melbourne, 08:00 in Perth

afterEach(() => {
  vi.unstubAllEnvs();
});

type Person = { id: string; email: string; firstName: string; emailVerified: boolean };

async function person(email: string, data: { timezone?: string } = {}): Promise<Person> {
  const user = await createUser(email);
  return db.user.update({ where: { id: user.id }, data: { firstName: email.split("@")[0], ...data } });
}

function lastInviteToken(to: string) {
  const mail = testOutbox.filter((message) => message.to === to).at(-1);
  const token = mail?.text.match(/\/invites\/([A-Za-z0-9_-]{43})/)?.[1];
  if (!token) throw new Error(`No invite sent to ${to}`);
  return token;
}

async function share(owner: Person, member: Person) {
  const sent = await inviteCollaborator(owner, member.email);
  if (!sent.ok) throw new Error(sent.message);
  const accepted = await acceptInvite(member, lastInviteToken(member.email));
  if (!accepted.ok) throw new Error(accepted.reason);
}

async function propertyWithDocument(ownerId: string) {
  const property = await insertProperty(ownerId);
  const completion = await recordCompletion(ownerId, property.id, "gas", { completedOn: "2026-09-01", providerName: null, providerLicenceNumber: null, notes: null });
  if (!completion.ok) throw new Error("setup failed");
  const upload = await uploadDocument(ownerId, property.id, completion.recordId, { name: "Gas.pdf", bytes: pdfBytes() });
  if (!upload.ok) throw new Error("upload failed");
  return { propertyId: property.id, recordId: completion.recordId, documentId: upload.documentId };
}

const completion = { completedOn: "2026-09-10", providerName: null, providerLicenceNumber: null, notes: null };

describe("access for owner, collaborator and stranger", () => {
  it("lets a collaborator read and work on every owner property, and a stranger nothing", async () => {
    const owner = await person("owner@example.com");
    const { cookie: memberCookie, userId: memberId } = await createVerifiedUser("member@example.com");
    const { cookie: strangerCookie, userId: strangerId } = await createVerifiedUser("stranger@example.com");
    const member = (await db.user.findUniqueOrThrow({ where: { id: memberId } })) as Person;
    await share(owner, member);
    const { propertyId, recordId, documentId } = await propertyWithDocument(owner.id);

    for (const [userId, allowed] of [
      [memberId, true],
      [strangerId, false],
    ] as const) {
      expect(Boolean(await findPropertyForUser(userId, propertyId))).toBe(allowed);
      expect(Boolean(await getPropertySchedule(userId, propertyId, T))).toBe(allowed);
      expect(Boolean(await listPropertyHistory(userId, propertyId, 1))).toBe(allowed);
      expect((await listPropertiesForUser(userId, { view: "active", page: 1 })).total).toBe(allowed ? 1 : 0);
      expect((await getDashboard(userId, T)).propertyCount).toBe(allowed ? 1 : 0);
      expect((await listDocumentsForUser(userId, 1)).total).toBe(allowed ? 1 : 0);
    }

    const cookieFor = { [memberId]: memberCookie, [strangerId]: strangerCookie };
    for (const [userId, status] of [
      [memberId, 200],
      [strangerId, 404],
    ] as const) {
      const headers = new Headers({ cookie: cookieFor[userId] });
      const file = await download(new Request(`http://localhost:3000/api/documents/${documentId}/download`, { headers }), {
        params: Promise.resolve({ id: documentId }),
      });
      expect(file.status).toBe(status);
      const pack = await downloadPack(new Request(`http://localhost:3000/api/properties/${propertyId}/compliance-pack`, { headers }), {
        params: Promise.resolve({ id: propertyId }),
      });
      expect(pack.status).toBe(status);
    }

    // Writes: the collaborator works on compliance; files go under the owner's prefix.
    expect(await recordCompletion(memberId, propertyId, "smoke_alarm", completion)).toMatchObject({ ok: true });
    expect(await updateRecord(memberId, propertyId, recordId, { ...completion, providerName: "ABC" })).toEqual({ ok: true });
    expect(await setRequirementApplicable(memberId, propertyId, "electrical", false)).toEqual({ ok: true });
    const upload = await uploadDocument(memberId, propertyId, recordId, { name: "Member.pdf", bytes: pdfBytes() });
    if (!upload.ok) throw new Error("upload failed");
    expect((await db.complianceDocument.findUniqueOrThrow({ where: { id: upload.documentId } })).storageKey).toBe(`documents/${owner.id}/${upload.documentId}`);

    expect(await recordCompletion(strangerId, propertyId, "smoke_alarm", completion)).toEqual({ ok: false, reason: "not_found" });
    expect(await uploadDocument(strangerId, propertyId, recordId, { name: "x.pdf", bytes: pdfBytes() })).toEqual({ ok: false, reason: "not_found" });

    // Owner-only actions refuse the collaborator.
    expect(await updateProperty(memberId, propertyId, propertyInput({ suburb: "Carlton" }))).toBeNull();
    expect(await archiveProperty(memberId, propertyId)).toBe(false);
    expect(await deleteProperty(memberId, propertyId)).toBe("not_found");
    expect(await transferProperty(memberId, propertyId, owner.id)).toBe("not_found");
    expect(await listPropertiesForExport(memberId)).toEqual([]);
  });

  it("includes properties the owner adds later, and ends access on removal or leaving", async () => {
    const owner = await person("owner@example.com");
    const member = await person("member@example.com");
    await share(owner, member);
    const later = await insertProperty(owner.id);
    expect(await findPropertyForUser(member.id, later.id)).not.toBeNull();

    expect(await removeCollaborator(owner.id, member.id)).toBe(true);
    expect(await findPropertyForUser(member.id, later.id)).toBeNull();
    expect(await db.auditEvent.count({ where: { userId: owner.id, action: "sharing.collaborator_removed" } })).toBe(1);

    await share(owner, member);
    expect(await leaveSharedAccount(member.id, owner.id)).toBe(true);
    expect(await findPropertyForUser(member.id, later.id)).toBeNull();
  });

  it("follows the owner's plan for writes, not the collaborator's", async () => {
    const owner = await person("owner@example.com");
    const member = await person("member@example.com");
    await share(owner, member);
    const property = await insertProperty(owner.id);
    const past = new Date(Date.now() - 86_400_000);

    await db.user.update({ where: { id: member.id }, data: { trialEndsAt: past } });
    expect(await recordCompletion(member.id, property.id, "gas", completion)).toMatchObject({ ok: true });

    await db.user.update({ where: { id: owner.id }, data: { trialEndsAt: past } });
    expect(await recordCompletion(member.id, property.id, "gas", completion)).toEqual({ ok: false, reason: "read_only" });
  });
});

describe("invites", () => {
  it("emails a link, stores only the token hash, and accepts once", async () => {
    const owner = await person("owner@example.com");
    const member = await person("member@example.com");

    expect(await inviteCollaborator(owner, " Member@Example.com ")).toEqual({ ok: true });
    const token = lastInviteToken("member@example.com");
    expect(testOutbox.at(-1)).toMatchObject({ to: "member@example.com", subject: "owner shared their properties with you on RentCert" });
    const invite = await db.sharingInvite.findFirstOrThrow();
    expect(invite).toMatchObject({ email: "member@example.com", tokenHash: hashInviteToken(token), acceptedAt: null });
    expect(JSON.stringify(invite)).not.toContain(token);
    expect(await findInvite(token)).toEqual({ ownerId: owner.id, ownerFirstName: "owner", email: "member@example.com" });

    expect(await acceptInvite(member, token)).toEqual({ ok: true, ownerId: owner.id });
    expect(await db.accountCollaborator.count({ where: { ownerId: owner.id, memberId: member.id } })).toBe(1);
    expect(await acceptInvite(member, token)).toEqual({ ok: false, reason: "invalid" });
    expect(await findInvite(token)).toBeNull();

    const events = await db.auditEvent.findMany({ where: { action: { startsWith: "sharing." } }, orderBy: { createdAt: "asc" } });
    expect(events.map((event) => event.action)).toEqual(["sharing.invite_sent", "sharing.invite_accepted"]);
    expect(JSON.stringify(events)).not.toContain("member@example.com");
  });

  it("refuses an account with a different or unverified email", async () => {
    const owner = await person("owner@example.com");
    const other = await person("other@example.com");
    await inviteCollaborator(owner, "member@example.com");
    const token = lastInviteToken("member@example.com");

    expect(await acceptInvite(other, token)).toEqual({ ok: false, reason: "wrong_email" });
    const unverified = await db.user.update({ where: { id: (await person("member@example.com")).id }, data: { emailVerified: false } });
    expect(await acceptInvite(unverified, token)).toEqual({ ok: false, reason: "wrong_email" });
    expect(await db.accountCollaborator.count()).toBe(0);
  });

  it("treats expired, revoked, replaced and made-up links the same", async () => {
    const owner = await person("owner@example.com");
    const member = await person("member@example.com");

    await inviteCollaborator(owner, member.email, new Date(Date.now() - 8 * 86_400_000));
    const expired = lastInviteToken(member.email);
    expect(await findInvite(expired)).toBeNull();
    expect(await acceptInvite(member, expired)).toEqual({ ok: false, reason: "invalid" });

    await inviteCollaborator(owner, member.email);
    const replaced = lastInviteToken(member.email);
    await inviteCollaborator(owner, member.email);
    const current = lastInviteToken(member.email);
    expect(await findInvite(replaced)).toBeNull();
    expect(await db.sharingInvite.count()).toBe(1);

    const invite = await db.sharingInvite.findFirstOrThrow();
    expect(await revokeInvite(owner.id, invite.id)).toBe(true);
    expect(await findInvite(current)).toBeNull();
    expect(await acceptInvite(member, current)).toEqual({ ok: false, reason: "invalid" });

    expect(await findInvite("x".repeat(43))).toBeNull();
    expect(await findInvite("not a token")).toBeNull();
    expect(await revokeInvite(owner.id, "not-a-uuid")).toBe(false);
  });

  it("refuses self, existing collaborators and more than the limits", async () => {
    const owner = await person("owner@example.com");
    const member = await person("member@example.com");
    await share(owner, member);

    expect(await inviteCollaborator(owner, "OWNER@example.com")).toEqual({ ok: false, message: SHARING_MESSAGES.self });
    expect(await inviteCollaborator(owner, member.email)).toEqual({ ok: false, message: SHARING_MESSAGES.alreadyShared });

    for (let index = 1; index < MAX_COLLABORATORS; index++) {
      expect(await inviteCollaborator(owner, `friend${index}@example.com`)).toEqual({ ok: true });
    }
    expect(await inviteCollaborator(owner, "one-too-many@example.com")).toEqual({ ok: false, message: SHARING_MESSAGES.tooMany });
    // Re-sending a pending invite does not count as another person.
    expect(await inviteCollaborator(owner, "friend1@example.com")).toEqual({ ok: true });
  });

  it("allows at most the daily number of invite emails, re-sends included", async () => {
    const owner = await person("owner@example.com");
    for (let index = 0; index < MAX_INVITES_PER_DAY; index++) {
      expect(await inviteCollaborator(owner, "friend@example.com")).toEqual({ ok: true });
    }
    expect(await inviteCollaborator(owner, "friend@example.com")).toEqual({ ok: false, message: SHARING_MESSAGES.dailyLimit });
  });

  it("only returns to an invite path after sign-in", () => {
    const token = "a".repeat(43);
    expect(inviteReturnPath(token)).toBe(`/invites/${token}`);
    for (const value of ["//evil.example", "https://evil.example", `${token}/../x`, undefined, ["a"]]) {
      expect(inviteReturnPath(value)).toBeUndefined();
    }
  });
});

describe("property transfer", () => {
  it("moves the property and its files to the collaborator", async () => {
    const owner = await person("owner@example.com");
    const member = await person("member@example.com");
    const other = await person("other@example.com");
    await share(owner, member);
    await share(owner, other);
    const { propertyId, documentId } = await propertyWithDocument(owner.id);
    const oldKey = `documents/${owner.id}/${documentId}`;

    expect(await transferProperty(owner.id, propertyId, member.id)).toBe("transferred");

    expect((await db.property.findUniqueOrThrow({ where: { id: propertyId } })).userId).toBe(member.id);
    const document = await db.complianceDocument.findUniqueOrThrow({ where: { id: documentId } });
    expect(document.storageKey).toBe(`documents/${member.id}/${documentId}`);
    expect(existsSync(path.join(STORAGE_ROOT, document.storageKey))).toBe(true);
    expect(existsSync(path.join(STORAGE_ROOT, oldKey))).toBe(false);
    expect(await getStorage().read(document.storageKey)).toEqual(pdfBytes());

    expect(await findPropertyForUser(owner.id, propertyId)).toBeNull();
    expect(await findPropertyForUser(other.id, propertyId)).toBeNull();
    expect(await findPropertyForUser(member.id, propertyId)).not.toBeNull();
    expect(await db.auditEvent.count({ where: { action: "property.transferred" } })).toBe(2);
  });

  it("needs a free slot on the new owner's plan, and a collaborator as the target", async () => {
    const owner = await person("owner@example.com");
    const member = await person("member@example.com");
    const stranger = await person("stranger@example.com");
    await share(owner, member);
    const property = await insertProperty(owner.id);
    await insertProperty(member.id); // the trial allows one active property

    expect(await transferProperty(owner.id, property.id, member.id)).toBe("no_slot");
    expect((await db.property.findUniqueOrThrow({ where: { id: property.id } })).userId).toBe(owner.id);

    await subscribe(member.id, "PORTFOLIO");
    expect(await transferProperty(owner.id, property.id, stranger.id)).toBe("not_found");
    expect(await transferProperty(owner.id, property.id, member.id)).toBe("transferred");
  });
});

describe("reminders for shared properties", () => {
  async function dueGasRecord(ownerId: string) {
    const property = await insertProperty(ownerId);
    const result = await recordCompletion(ownerId, property.id, "gas", completion);
    if (!result.ok) throw new Error("setup failed");
    await db.complianceRecord.update({
      where: { id: result.recordId },
      data: { nextDueOn: new Date(`${addDays(T, 7)}T00:00:00Z`), createdAt: new Date(`${addDays(T, -60)}T00:00:00Z`) },
    });
    return result.recordId;
  }

  async function scanAndSend() {
    const claimed = await scanDueReminders(NOW);
    for (const id of claimed) await sendReminder(id);
    return claimed;
  }

  it("emails the owner and each collaborator once, in their own timezone", async () => {
    const owner = await person("owner@example.com");
    const member = await person("member@example.com", { timezone: "Australia/Perth" });
    const quiet = await person("quiet@example.com");
    await share(owner, member);
    await share(owner, quiet);
    await db.user.update({ where: { id: quiet.id }, data: { reminderEmailsEnabled: false } });
    await dueGasRecord(owner.id);
    testOutbox.length = 0;

    expect(await scanAndSend()).toHaveLength(2);
    expect(testOutbox.map((mail) => mail.to).sort()).toEqual(["member@example.com", "owner@example.com"]);
    expect(await scanAndSend()).toEqual([]);
    expect(testOutbox).toHaveLength(2);
  });

  it("skips a collaborator removed after the reminder was claimed, and none when the owner is read-only", async () => {
    const owner = await person("owner@example.com");
    const member = await person("member@example.com");
    await share(owner, member);
    await dueGasRecord(owner.id);
    testOutbox.length = 0;

    const claimed = await scanDueReminders(NOW);
    await removeCollaborator(owner.id, member.id);
    for (const id of claimed) await sendReminder(id);
    expect(testOutbox.map((mail) => mail.to)).toEqual(["owner@example.com"]);

    await share(owner, member);
    await db.complianceReminder.deleteMany();
    await db.user.update({ where: { id: owner.id }, data: { trialEndsAt: new Date(NOW.getTime() - 1000) } });
    expect(await scanDueReminders(NOW)).toEqual([]);
  });
});

describe("account deletion and export", () => {
  it("emails collaborators after an owner deletes their account", async () => {
    const { cookie, userId: ownerId } = await createVerifiedUser("owner@example.com");
    const owner = (await db.user.findUniqueOrThrow({ where: { id: ownerId } })) as Person;
    const member = await person("member@example.com");
    await share(owner, member);
    await insertProperty(owner.id);
    testOutbox.length = 0;

    expect((await callAuth("/delete-user", { cookie, body: { password: VALID_PASSWORD } })).status).toBe(200);

    expect(testOutbox.map((mail) => [mail.to, mail.subject])).toEqual([["member@example.com", `${owner.firstName} closed their RentCert account`]]);
    expect(await db.property.count()).toBe(0);
    expect(await db.accountCollaborator.count()).toBe(0);
  });

  it("emails nobody when the deletion fails", async () => {
    const { cookie, userId: ownerId } = await createVerifiedUser("owner@example.com");
    const owner = (await db.user.findUniqueOrThrow({ where: { id: ownerId } })) as Person;
    await share(owner, await person("member@example.com"));
    await subscribe(ownerId, "PORTFOLIO");
    vi.stubEnv("STRIPE_SECRET_KEY", ""); // Stripe unreachable
    testOutbox.length = 0;

    expect((await callAuth("/delete-user", { cookie, body: { password: VALID_PASSWORD } })).status).toBe(503);
    expect(testOutbox).toEqual([]);
  });

  it("keeps a transferred property's files when the old owner deletes their account", async () => {
    const { cookie, userId: ownerId } = await createVerifiedUser("owner@example.com");
    const owner = (await db.user.findUniqueOrThrow({ where: { id: ownerId } })) as Person;
    const member = await person("member@example.com");
    await share(owner, member);
    const { propertyId, documentId } = await propertyWithDocument(owner.id);
    expect(await transferProperty(owner.id, propertyId, member.id)).toBe("transferred");
    // Simulate a move that failed after the transfer: the file is still under the old prefix.
    const newKey = `documents/${member.id}/${documentId}`;
    const oldKey = `documents/${owner.id}/${documentId}`;
    await getStorage().copy(newKey, oldKey);
    await getStorage().delete(newKey);
    await db.complianceDocument.update({ where: { id: documentId }, data: { storageKey: oldKey } });

    expect((await callAuth("/delete-user", { cookie, body: { password: VALID_PASSWORD } })).status).toBe(200);

    const document = await db.complianceDocument.findUniqueOrThrow({ where: { id: documentId } });
    expect(document.storageKey).toBe(newKey);
    expect(await getStorage().read(newKey)).toEqual(pdfBytes());
    expect(existsSync(path.join(STORAGE_ROOT, "documents", owner.id))).toBe(false);
  });

  it("removes a deleted collaborator's access rows and keeps the owner's data", async () => {
    const owner = await person("owner@example.com");
    const { cookie, userId: memberId } = await createVerifiedUser("member@example.com");
    await share(owner, (await db.user.findUniqueOrThrow({ where: { id: memberId } })) as Person);
    const property = await insertProperty(owner.id);

    expect((await callAuth("/delete-user", { cookie, body: { password: VALID_PASSWORD } })).status).toBe(200);
    expect(await db.accountCollaborator.count()).toBe(0);
    expect(await findPropertyForUser(owner.id, property.id)).not.toBeNull();
  });

  it("exports sharing as a list, never another owner's properties", async () => {
    const owner = await person("owner@example.com");
    const member = await person("member@example.com");
    await share(owner, member);
    await insertProperty(owner.id);

    expect(await listSharingForExport(member.id)).toEqual({ sharesWith: [], sharedWithMe: [{ ownerFirstName: "owner", since: expect.any(Date) }] });
    expect(await listSharingForExport(owner.id)).toEqual({ sharesWith: [{ email: "member@example.com", since: expect.any(Date) }], sharedWithMe: [] });
    expect(await listPropertiesForExport(member.id)).toEqual([]);
  });
});
