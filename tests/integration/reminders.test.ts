import { mkdirSync, utimesSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, todayIn } from "@/lib/calendar-date";
import { recordCompletion, setRequirementApplicable, setUpChecks } from "@/server/compliance/commands";
import { db } from "@/server/db";
import { testOutbox } from "@/server/mail/deliver";
import { archiveProperty, createProperty } from "@/server/properties/commands";
import { scanDueReminders } from "@/server/reminders/scan";
import { MAX_SEND_ATTEMPTS, sendReminder } from "@/server/reminders/send";
import { sendWelcome } from "@/server/reminders/welcome";
import { deleteOrphanedFiles } from "@/server/vault/cleanup";
import { createVerifiedUser } from "../support/auth-http";
import { createUser, propertyInput } from "../support/factories";

// A fixed instant: midnight UTC on Melbourne's current date, which is 10:00 or 11:00 in Melbourne.
const T = todayIn("Australia/Melbourne");
const NOW = new Date(`${T}T00:00:00Z`);

afterEach(() => {
  vi.unstubAllEnvs();
});

// A gas record whose next due date is T + daysUntilDue, entered `enteredDaysAgo` days ago.
async function gasRecord(userId: string, daysUntilDue: number, enteredDaysAgo = 60, overrides = {}) {
  const property = await createProperty(userId, propertyInput(overrides));
  const completedOn = addDays(addDays(T, daysUntilDue), -730); // 24-month interval, approximately
  const result = await recordCompletion(userId, property.id, "gas", {
    completedOn,
    providerName: null,
    providerLicenceNumber: null,
    notes: null,
  });
  if (!result.ok) throw new Error("setup failed");
  await db.complianceRecord.update({
    where: { id: result.recordId },
    data: { nextDueOn: new Date(`${addDays(T, daysUntilDue)}T00:00:00Z`), createdAt: new Date(`${addDays(T, -enteredDaysAgo)}T00:00:00Z`) },
  });
  return { propertyId: property.id, recordId: result.recordId };
}

async function scanAndSendAll() {
  const claimed = await scanDueReminders(NOW);
  for (const id of claimed) await sendReminder(id);
  return claimed;
}

describe("scenario 6: a due reminder is sent once", () => {
  it("sends one email, marks it sent, and a second scan sends no copy", async () => {
    const user = await createUser("owner@example.com");
    const { recordId } = await gasRecord(user.id, 7);

    expect(await scanAndSendAll()).toHaveLength(1);
    expect(testOutbox).toHaveLength(1);
    expect(testOutbox[0]).toMatchObject({ to: "owner@example.com", subject: "Gas safety check for 12 Example Street is due in 7 days" });
    expect(await db.complianceReminder.findFirstOrThrow({ where: { complianceRecordId: recordId } })).toMatchObject({
      reminderType: "DAYS_7",
      status: "SENT",
      attempts: 1,
    });

    expect(await scanAndSendAll()).toEqual([]);
    expect(testOutbox).toHaveLength(1);
  });

  it("claims a reminder once even when two scans run in parallel", async () => {
    const user = await createUser();
    await gasRecord(user.id, 7);

    const [first, second] = await Promise.all([scanDueReminders(NOW), scanDueReminders(NOW)]);

    expect(first.length + second.length).toBe(1);
    expect(await db.complianceReminder.count()).toBe(1);
  });

  it("does not send the same reminder twice when the send job is retried after success", async () => {
    const user = await createUser();
    await gasRecord(user.id, 7);
    const [id] = await scanDueReminders(NOW);

    expect(await sendReminder(id)).toBe("sent");
    expect(await sendReminder(id)).toBe("already_done");
    expect(testOutbox).toHaveLength(1);
  });
});

describe("which reminder", () => {
  it("sends only the latest due type after a gap, with the real days remaining", async () => {
    const user = await createUser();
    await gasRecord(user.id, 5);

    await scanAndSendAll();

    expect((await db.complianceReminder.findMany()).map((row) => row.reminderType)).toEqual(["DAYS_7"]);
    expect(testOutbox[0].subject).toMatch(/is due in 5 days$/);
  });

  it("sends the overdue follow-up to the notification email when set", async () => {
    const user = await createUser("owner@example.com");
    await db.user.update({ where: { id: user.id }, data: { notificationEmail: "alerts@example.com" } });
    await gasRecord(user.id, -8);

    await scanAndSendAll();

    expect(testOutbox.map((mail) => [mail.to, mail.subject])).toEqual([
      ["alerts@example.com", "Gas safety check for 12 Example Street is overdue"],
    ]);
  });

  it("sends nothing for a record entered today with a past due date, until the overdue follow-up", async () => {
    const user = await createUser();
    await gasRecord(user.id, -3, 0);

    expect(await scanDueReminders(NOW)).toEqual([]);
    expect(await scanDueReminders(new Date(NOW.getTime() + 4 * 86_400_000))).toHaveLength(1);
  });

  it("sends no 'due today' email for an unknown last check entered today", async () => {
    const user = await createUser();
    const property = await createProperty(user.id, propertyInput());
    await setUpChecks(user.id, property.id, T, { gas: { choice: "unknown" } });

    expect(await scanDueReminders(NOW)).toEqual([]);
  });
});

describe("reminders that do not apply", () => {
  it.each([
    ["a superseded record", async (userId: string) => {
      const { propertyId } = await gasRecord(userId, 7);
      await recordCompletion(userId, propertyId, "gas", { completedOn: T, providerName: null, providerLicenceNumber: null, notes: null });
    }],
    ["an archived property", async (userId: string) => {
      const { propertyId } = await gasRecord(userId, 7);
      await archiveProperty(userId, propertyId);
    }],
    ["a not-applicable requirement", async (userId: string) => {
      const { propertyId } = await gasRecord(userId, 7);
      await setRequirementApplicable(userId, propertyId, "gas", false);
    }],
    ["a user with reminders off", async (userId: string) => {
      await gasRecord(userId, 7);
      await db.user.update({ where: { id: userId }, data: { reminderEmailsEnabled: false } });
    }],
    ["an unverified user", async (userId: string) => {
      await gasRecord(userId, 7);
      await db.user.update({ where: { id: userId }, data: { emailVerified: false } });
    }],
  ])("sends nothing for %s", async (_name, arrange) => {
    const user = await createUser();
    await arrange(user.id);

    expect(await scanAndSendAll()).toEqual([]);
    expect(testOutbox).toHaveLength(0);
  });

  it("marks a claimed reminder SKIPPED when it stops applying before sending", async () => {
    const user = await createUser();
    const { propertyId } = await gasRecord(user.id, 7);
    const [id] = await scanDueReminders(NOW);
    await archiveProperty(user.id, propertyId);

    expect(await sendReminder(id)).toBe("skipped");
    expect((await db.complianceReminder.findUniqueOrThrow({ where: { id } })).status).toBe("SKIPPED");
    expect(testOutbox).toHaveLength(0);
  });

  it("sends each user's reminder only to that user", async () => {
    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");
    await gasRecord(alice.id, 7);
    await gasRecord(bob.id, -8, 60, { addressLine1: "4 Sample Road" });

    await scanAndSendAll();

    expect(testOutbox.map((mail) => [mail.to, mail.subject]).sort()).toEqual([
      ["alice@example.com", "Gas safety check for 12 Example Street is due in 7 days"],
      ["bob@example.com", "Gas safety check for 4 Sample Road is overdue"],
    ]);
  });
});

describe("delivery failures", () => {
  it("retries, then marks the reminder FAILED after the last attempt", async () => {
    const user = await createUser();
    await gasRecord(user.id, 7);
    const [id] = await scanDueReminders(NOW);
    vi.stubEnv("EMAIL_PROVIDER", "unavailable");

    for (let attempt = 1; attempt < MAX_SEND_ATTEMPTS; attempt++) {
      await expect(sendReminder(id)).rejects.toThrow();
      expect(await db.complianceReminder.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: "PENDING", attempts: attempt, lastError: "Error" });
    }
    await expect(sendReminder(id)).rejects.toThrow();
    expect((await db.complianceReminder.findUniqueOrThrow({ where: { id } })).status).toBe("FAILED");
    expect(await sendReminder(id)).toBe("already_done");
  });

  it("sends after a temporary failure", async () => {
    const user = await createUser();
    await gasRecord(user.id, 7);
    const [id] = await scanDueReminders(NOW);

    vi.stubEnv("EMAIL_PROVIDER", "unavailable");
    await expect(sendReminder(id)).rejects.toThrow();
    vi.stubEnv("EMAIL_PROVIDER", "test");

    expect(await sendReminder(id)).toBe("sent");
    expect(await db.complianceReminder.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: "SENT", attempts: 2, lastError: null });
    expect(testOutbox).toHaveLength(1);
  });
});

describe("welcome email", () => {
  it("is sent once, after email verification", async () => {
    const { userId } = await createVerifiedUser("new@example.com");

    expect(testOutbox.filter((mail) => mail.subject === "Welcome to RentCert").map((mail) => mail.to)).toEqual(["new@example.com"]);
    expect(await sendWelcome(userId)).toBe("already_done");
    expect(testOutbox.filter((mail) => mail.subject === "Welcome to RentCert")).toHaveLength(1);
  });

  it("releases its claim when sending fails, so a retry can send it", async () => {
    const user = await createUser();
    vi.stubEnv("EMAIL_PROVIDER", "unavailable");
    await expect(sendWelcome(user.id)).rejects.toThrow();
    vi.stubEnv("EMAIL_PROVIDER", "test");

    expect(await sendWelcome(user.id)).toBe("sent");
  });
});

describe("orphaned file cleanup", () => {
  it("deletes old files with no document row and keeps everything else", async () => {
    const root = path.resolve("tmp/test-storage/documents/orphan_user");
    mkdirSync(root, { recursive: true });
    const oldOrphan = path.join(root, "0192f0a4-5b6c-7d8e-9f00-000000000001");
    const newOrphan = path.join(root, "0192f0a4-5b6c-7d8e-9f00-000000000002");
    writeFileSync(oldOrphan, "x");
    writeFileSync(newOrphan, "x");
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000);
    utimesSync(oldOrphan, twoDaysAgo, twoDaysAgo);

    expect(await deleteOrphanedFiles()).toBe(1);
    expect(existsSync(oldOrphan)).toBe(false);
    expect(existsSync(newOrphan)).toBe(true);
  });
});
