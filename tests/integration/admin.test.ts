import { describe, expect, it } from "vitest";
import { createRequirement, markRequirementVerified, setTrialDays, setUserRole, updateRequirement } from "@/server/admin/commands";
import { requirementsFor } from "@/server/compliance/requirements";
import { getMetrics, listPropertiesForAdmin, listUsers } from "@/server/admin/queries";
import { trialDays } from "@/server/billing/settings";
import { recordCompletion } from "@/server/compliance/commands";
import { db } from "@/server/db";
import { callAuth, createVerifiedUser } from "../support/auth-http";
import { createUser, insertProperty, subscribe } from "../support/factories";

async function admin() {
  const user = await createUser("admin@example.com");
  return db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
}

describe("roles", () => {
  it("cannot be raised through the auth API", async () => {
    const { cookie, userId } = await createVerifiedUser();

    await callAuth("/update-user", { cookie, body: { role: "ADMIN" } });

    expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).role).toBe("USER");
  });

  it("cannot be chosen at sign-up", async () => {
    await callAuth("/sign-up/email", {
      body: { email: "sneaky-admin@example.com", password: "correct horse battery staple", name: "S N", firstName: "S", lastName: "N", role: "ADMIN" },
    });
    const user = await db.user.findUnique({ where: { email: "sneaky-admin@example.com" } });
    if (user) expect(user.role).toBe("USER");
  });
});

describe("admin role changes", () => {
  it("grants and removes admin access with audit events", async () => {
    const adminUser = await admin();
    const other = await createUser("other@example.com");

    expect(await setUserRole(adminUser.id, other.id, "ADMIN")).toBe("ok");
    expect((await db.user.findUniqueOrThrow({ where: { id: other.id } })).role).toBe("ADMIN");
    expect(await setUserRole(adminUser.id, other.id, "USER")).toBe("ok");
    expect((await db.user.findUniqueOrThrow({ where: { id: other.id } })).role).toBe("USER");

    const events = await db.auditEvent.findMany({ where: { userId: adminUser.id, action: "admin.role_changed" }, orderBy: { createdAt: "asc" } });
    expect(events.map((event) => [event.resourceId, event.metadata])).toEqual([
      [other.id, { from: "USER", to: "ADMIN" }],
      [other.id, { from: "ADMIN", to: "USER" }],
    ]);
  });

  it("does not audit a role that is already set", async () => {
    const adminUser = await admin();
    const other = await createUser("other@example.com");

    expect(await setUserRole(adminUser.id, other.id, "USER")).toBe("ok");
    expect(await db.auditEvent.count({ where: { action: "admin.role_changed" } })).toBe(0);
  });

  it("refuses an admin's own role, so an admin always remains", async () => {
    const adminUser = await admin();

    expect(await setUserRole(adminUser.id, adminUser.id, "USER")).toBe("self");
    expect((await db.user.findUniqueOrThrow({ where: { id: adminUser.id } })).role).toBe("ADMIN");
  });

  it("reports an unknown user as not found", async () => {
    const adminUser = await admin();
    expect(await setUserRole(adminUser.id, "no-such-user", "ADMIN")).toBe("not_found");
  });
});

describe("admin requirement changes", () => {
  it("adds a requirement to a state, unverified and audited, and refuses a duplicate code", async () => {
    const adminUser = await admin();
    const input = {
      jurisdiction: "NSW",
      code: "pool_barrier",
      name: "Pool barrier check",
      description: "Pool barrier checked and in good repair.",
      recurrenceMonths: 36,
      basis: "REQUIRED_INTERVAL" as const,
      sourceName: null,
      sourceUrl: null,
      active: true,
    };
    try {
      expect(await createRequirement(adminUser.id, input)).toBe("created");
      const nsw = await requirementsFor("NSW");
      expect(nsw.requirements.map((row) => row.code)).toEqual(["smoke_alarm", "electrical", "gas", "pool_barrier"]);
      expect(nsw.requirements.at(-1)).toMatchObject({ recurrenceMonths: 36, lastVerifiedAt: null });
      const event = await db.auditEvent.findFirstOrThrow({ where: { action: "admin.requirement_created" } });
      expect(event.metadata).toEqual({ jurisdiction: "NSW", code: "pool_barrier", recurrenceMonths: 36, basis: "REQUIRED_INTERVAL" });

      expect(await createRequirement(adminUser.id, { ...input, name: "Again" })).toBe("duplicate");
    } finally {
      await db.complianceRequirement.deleteMany({ where: { code: "pool_barrier" } });
    }
  });

  it("updates a requirement, audits old and new values, and new completions use it", async () => {
    const adminUser = await admin();
    const gas = await db.complianceRequirement.findUniqueOrThrow({ where: { jurisdiction_code: { jurisdiction: "VIC", code: "gas" } } });
    try {
      await updateRequirement(adminUser.id, gas.id, {
        name: gas.name,
        description: gas.description,
        recurrenceMonths: 12,
        basis: gas.basis,
        sourceName: gas.sourceName,
        sourceUrl: gas.sourceUrl,
        active: true,
      });
      const event = await db.auditEvent.findFirstOrThrow({ where: { userId: adminUser.id, action: "admin.requirement_updated" } });
      expect(event.metadata).toEqual({ recurrenceMonths: { from: 24, to: 12 } });

      const owner = await createUser();
      const property = await insertProperty(owner.id);
      const result = await recordCompletion(owner.id, property.id, "gas", { completedOn: "2026-01-10", providerName: null, providerLicenceNumber: null, notes: null });
      expect(result).toMatchObject({ ok: true, nextDueOn: "2027-01-10" });
    } finally {
      await db.complianceRequirement.update({ where: { id: gas.id }, data: { recurrenceMonths: 24 } });
    }
  });

  it("marks a requirement verified with an audit event", async () => {
    const adminUser = await admin();
    const smoke = await db.complianceRequirement.findUniqueOrThrow({ where: { jurisdiction_code: { jurisdiction: "VIC", code: "smoke_alarm" } } });
    try {
      expect(await markRequirementVerified(adminUser.id, smoke.id)).toBe("VIC");
      expect((await db.complianceRequirement.findUniqueOrThrow({ where: { id: smoke.id } })).lastVerifiedAt).not.toBeNull();
      expect(await db.auditEvent.count({ where: { userId: adminUser.id, action: "admin.requirement_verified" } })).toBe(1);
    } finally {
      await db.complianceRequirement.update({ where: { id: smoke.id }, data: { lastVerifiedAt: null } });
    }
  });

  it("changes the trial length with an audit event", async () => {
    const adminUser = await admin();
    try {
      await setTrialDays(adminUser.id, 60);
      expect(await trialDays()).toBe(60);
      const event = await db.auditEvent.findFirstOrThrow({ where: { action: "admin.setting_updated" } });
      expect(event.metadata).toEqual({ from: 365, to: 60 });
    } finally {
      await db.appSetting.update({ where: { key: "trial_days" }, data: { value: 365 } });
    }
  });
});

describe("admin lists", () => {
  it("search users by email and never expose street addresses", async () => {
    await createUser("alice@example.com");
    await createUser("bob@example.com");
    const owner = await createUser("owner@example.com");
    await insertProperty(owner.id, { addressLine1: "99 Private Lane" });

    expect((await listUsers({ search: "ALICE", pageNumber: 1 })).users.map((user) => user.email)).toEqual(["alice@example.com"]);
    const { properties } = await listPropertiesForAdmin(1);
    expect(JSON.stringify(properties)).not.toContain("99 Private Lane");
    expect(properties[0]).toMatchObject({ suburb: "Narre Warren", user: { email: "owner@example.com" } });
  });
});

describe("metrics", () => {
  it("counts the funnel for the current month and MRR from active subscriptions", async () => {
    const a = await createVerifiedUser("a@example.com");
    await createVerifiedUser("b@example.com");
    await subscribe(a.userId, "PORTFOLIO");
    const c = await createUser("c@example.com");
    await subscribe(c.id, "PROPERTY");
    await subscribe(c.id, "PROPERTY", "canceled");
    await db.productEvent.createMany({
      data: [
        { name: "document_uploaded", userId: a.userId },
        { name: "document_uploaded", userId: a.userId },
        { name: "checkout_started", userId: a.userId },
      ],
    });

    const metrics = await getMetrics();
    const thisMonth = metrics.months.at(-1)!;

    expect(metrics.mrr).toBe(28);
    expect(metrics.activeSubscriptions).toBe(2);
    expect(thisMonth).toMatchObject({ signups: 2, firstCertificates: 1, checkoutsStarted: 1, cancellations: 1 });
  });
});
