import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import {
  recordCompletion,
  setRequirementApplicable,
  setUpChecks,
  updateRecord,
} from "@/server/compliance/commands";
import { requirementsFor } from "@/server/compliance/requirements";
import {
  filterDashboardRows,
  findRecordForUser,
  getDashboard,
  getPropertySchedule,
  listPropertyHistory,
  listRecentCompletions,
} from "@/server/compliance/queries";
import { archiveProperty, createProperty, deleteProperty } from "@/server/properties/commands";
import { createUser, propertyInput } from "../support/factories";

const TODAY = "2026-09-23";

const completion = (completedOn: string, providerName: string | null = "ABC Safety") => ({
  completedOn,
  providerName,
  providerLicenceNumber: "REC-123",
  notes: null,
});

async function vicPropertyWithSetup(userId: string) {
  const property = await createProperty(userId, propertyInput());
  await setUpChecks(userId, property.id, TODAY, {
    smoke_alarm: { choice: "date", lastCheckOn: "2025-10-10" },
    electrical: { choice: "unknown" },
    gas: { choice: "not_applicable" },
  });
  return property;
}

describe("requirementsFor", () => {
  it("uses Victorian rules for VIC and the general schedule elsewhere", async () => {
    const vic = await requirementsFor("VIC");
    const nsw = await requirementsFor("NSW");

    expect(vic.jurisdiction).toBe("VIC");
    expect(vic.requirements.map((row) => [row.code, row.recurrenceMonths])).toEqual([
      ["smoke_alarm", 12],
      ["electrical", 24],
      ["gas", 24],
    ]);
    expect(vic.requirements.every((row) => row.lastVerifiedAt === null)).toBe(true);
    expect(nsw.jurisdiction).toBe("GENERIC");
    expect(nsw.requirements.every((row) => row.sourceUrl === null)).toBe(true);
  });
});

describe("setting up checks (scenario 2)", () => {
  it("creates a dated record, an unknown starting point and an exclusion", async () => {
    const user = await createUser();
    const property = await vicPropertyWithSetup(user.id);

    const schedule = await getPropertySchedule(user.id, property.id, TODAY);
    expect(schedule!.items.map((item) => [item.requirement.code, item.status, item.nextDueOn])).toEqual([
      ["smoke_alarm", "due_soon", "2026-10-10"],
      ["electrical", "due", TODAY],
      ["gas", "not_applicable", null],
    ]);
    const audit = await db.auditEvent.findFirstOrThrow({ where: { userId: user.id, action: "property.checks_set_up" } });
    expect(audit.metadata).toEqual({ smoke_alarm: "date", electrical: "unknown", gas: "not_applicable" });
  });

  it("does not set up the same check twice", async () => {
    const user = await createUser();
    const property = await vicPropertyWithSetup(user.id);

    await setUpChecks(user.id, property.id, TODAY, { smoke_alarm: { choice: "unknown" } });

    expect(await db.complianceRecord.count({ where: { propertyId: property.id } })).toBe(2);
  });

  it("gives an NSW property the general schedule", async () => {
    const user = await createUser();
    const property = await createProperty(user.id, propertyInput({ state: "NSW", postcode: "2150", suburb: "Parramatta" }));

    const schedule = await getPropertySchedule(user.id, property.id, TODAY);
    expect(schedule).toMatchObject({ isGeneric: true, jurisdiction: "GENERIC" });
    expect(schedule!.items.every((item) => item.status === "not_set_up")).toBe(true);
  });
});

describe("recording a completed check (scenario 3)", () => {
  it("saves the record, calculates the next due date and keeps history", async () => {
    const user = await createUser();
    const property = await createProperty(user.id, propertyInput());
    await setUpChecks(user.id, property.id, TODAY, { gas: { choice: "date", lastCheckOn: "2024-09-02" } });

    const result = await recordCompletion(user.id, property.id, "gas", completion(TODAY));

    expect(result).toMatchObject({ ok: true, nextDueOn: "2028-09-23" });
    const gas = (await getPropertySchedule(user.id, property.id, TODAY))!.items.find((item) => item.requirement.code === "gas");
    expect(gas).toMatchObject({ status: "upcoming", lastCompletedOn: TODAY, nextDueOn: "2028-09-23" });

    const history = await listPropertyHistory(user.id, property.id, 1);
    expect(history!.records.map((record) => record.completedOn?.toISOString().slice(0, 10))).toEqual([TODAY, "2024-09-02"]);
    expect(await db.auditEvent.count({ where: { userId: user.id, action: "compliance_record.created" } })).toBe(1);
  });

  it("refuses an unknown requirement code", async () => {
    const user = await createUser();
    const property = await createProperty(user.id, propertyInput());

    expect(await recordCompletion(user.id, property.id, "pool_fence", completion(TODAY))).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("editing a record", () => {
  it("recalculates the next due date and audits old and new values", async () => {
    const user = await createUser();
    const property = await createProperty(user.id, propertyInput());
    const created = await recordCompletion(user.id, property.id, "smoke_alarm", completion("2026-09-01"));
    if (!created.ok) throw new Error("setup failed");

    await updateRecord(user.id, property.id, created.recordId, { ...completion("2026-08-15", "XYZ Fire"), notes: "private note" });

    const record = await db.complianceRecord.findUniqueOrThrow({ where: { id: created.recordId } });
    expect(record.nextDueOn.toISOString().slice(0, 10)).toBe("2027-08-15");
    const event = await db.auditEvent.findFirstOrThrow({ where: { action: "compliance_record.updated" } });
    expect(event.metadata).toEqual({
      changes: {
        completedOn: { from: "2026-09-01", to: "2026-08-15" },
        nextDueOn: { from: "2027-09-01", to: "2027-08-15" },
        providerName: { from: "ABC Safety", to: "XYZ Fire" },
        notes: { changed: true },
      },
    });
  });
});

describe("applicability", () => {
  it("toggles a requirement off and on with audit events", async () => {
    const user = await createUser();
    const property = await createProperty(user.id, propertyInput());

    await setRequirementApplicable(user.id, property.id, "gas", false);
    expect((await getPropertySchedule(user.id, property.id, TODAY))!.items[2].status).toBe("not_applicable");
    await setRequirementApplicable(user.id, property.id, "gas", true);
    expect((await getPropertySchedule(user.id, property.id, TODAY))!.items[2].status).toBe("not_set_up");

    const actions = (await db.auditEvent.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } })).map((e) => e.action);
    expect(actions).toEqual(["property.created", "property.requirement_excluded", "property.requirement_included"]);
  });
});

describe("property deletion with history", () => {
  it("is refused once records exist, but archiving still works", async () => {
    const user = await createUser();
    const property = await vicPropertyWithSetup(user.id);

    expect(await deleteProperty(user.id, property.id)).toBe("has_history");
    expect(await archiveProperty(user.id, property.id)).toBe(true);
    expect(await db.complianceRecord.count({ where: { propertyId: property.id } })).toBe(2);
  });

  it("removes records and exclusions when the account is deleted", async () => {
    const user = await createUser();
    const property = await vicPropertyWithSetup(user.id);

    await db.user.delete({ where: { id: user.id } });

    expect(await db.complianceRecord.count({ where: { propertyId: property.id } })).toBe(0);
    expect(await db.propertyRequirementExclusion.count({ where: { propertyId: property.id } })).toBe(0);
  });
});

describe("tenant isolation", () => {
  it("never exposes or changes another user's compliance data", async () => {
    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");
    const property = await vicPropertyWithSetup(alice.id);
    const record = await db.complianceRecord.findFirstOrThrow({ where: { propertyId: property.id, kind: "COMPLETED" } });
    const before = await db.complianceRecord.findMany({ where: { propertyId: property.id }, orderBy: { id: "asc" } });

    expect(await getPropertySchedule(bob.id, property.id, TODAY)).toBeNull();
    expect(await listPropertyHistory(bob.id, property.id, 1)).toBeNull();
    expect(await findRecordForUser(bob.id, property.id, record.id)).toBeNull();
    expect(await recordCompletion(bob.id, property.id, "smoke_alarm", completion(TODAY))).toEqual({ ok: false, reason: "not_found" });
    expect(await updateRecord(bob.id, property.id, record.id, completion(TODAY))).toEqual({ ok: false, reason: "not_found" });
    expect(await setRequirementApplicable(bob.id, property.id, "gas", true)).toEqual({ ok: false, reason: "not_found" });
    expect(await setUpChecks(bob.id, property.id, TODAY, { gas: { choice: "unknown" } })).toEqual({ ok: false, reason: "not_found" });

    // Bob's own property id with Alice's record id must not match either.
    const bobs = await createProperty(bob.id, propertyInput());
    expect(await findRecordForUser(bob.id, bobs.id, record.id)).toBeNull();
    expect(await updateRecord(bob.id, bobs.id, record.id, completion(TODAY))).toEqual({ ok: false, reason: "not_found" });

    expect(await db.complianceRecord.findMany({ where: { propertyId: property.id }, orderBy: { id: "asc" } })).toEqual(before);
    expect((await getDashboard(bob.id, TODAY)).rows.every((row) => row.propertyId === bobs.id)).toBe(true);
  });
});

describe("dashboard", () => {
  afterEach(() => vi.restoreAllMocks());

  it("counts statuses across active properties only and filters rows", async () => {
    const user = await createUser();
    await vicPropertyWithSetup(user.id); // smoke due soon, electrical due today, gas n/a
    const second = await createProperty(user.id, propertyInput({ addressLine1: "4 Sample Road" }));
    await setUpChecks(user.id, second.id, TODAY, {
      smoke_alarm: { choice: "date", lastCheckOn: "2025-09-01" }, // overdue (2026-09-01)
      electrical: { choice: "date", lastCheckOn: "2026-01-01" }, // upcoming (2028-01-01)
    });
    const archived = await vicPropertyWithSetup(user.id);
    await archiveProperty(user.id, archived.id);

    const dashboard = await getDashboard(user.id, TODAY);

    expect(dashboard.propertyCount).toBe(2);
    expect(dashboard.counts).toEqual({ overdue: 1, dueSoon: 2, upToDate: 1, notSetUp: 1 });
    expect(dashboard.rows.map((row) => row.item.nextDueOn)).toEqual(["2026-09-01", TODAY, "2026-10-10", "2028-01-01"]);
    expect(filterDashboardRows(dashboard.rows, "due_soon")).toHaveLength(2);
    expect(filterDashboardRows(dashboard.rows, "overdue")).toHaveLength(1);
    expect(filterDashboardRows(dashboard.rows, "upcoming")).toHaveLength(1);
  });

  it("uses the same number of queries for 1 and 4 properties", async () => {
    const countQueries = async (userId: string) => {
      const spies = [
        vi.spyOn(db.property, "findMany"),
        vi.spyOn(db.complianceRecord, "findMany"),
        vi.spyOn(db.complianceRequirement, "findMany"),
        vi.spyOn(db.propertyRequirementExclusion, "findMany"),
      ];
      await getDashboard(userId, TODAY);
      const total = spies.reduce((sum, spy) => sum + spy.mock.calls.length, 0);
      vi.restoreAllMocks();
      return total;
    };
    const one = await createUser();
    await vicPropertyWithSetup(one.id);
    const four = await createUser();
    for (let i = 0; i < 4; i++) await vicPropertyWithSetup(four.id);

    const oneCount = await countQueries(one.id);
    expect(oneCount).toBeGreaterThan(0);
    expect(await countQueries(four.id)).toBe(oneCount);
  });

  it("lists completions from the last 12 months", async () => {
    const user = await createUser();
    const property = await createProperty(user.id, propertyInput());
    await recordCompletion(user.id, property.id, "gas", completion("2025-09-22"));
    await recordCompletion(user.id, property.id, "smoke_alarm", completion("2026-09-01"));

    const recent = await listRecentCompletions(user.id, TODAY);
    expect(recent.map((record) => record.completedOn?.toISOString().slice(0, 10))).toEqual(["2026-09-01"]);
  });

  it("decides 'today' from the date passed in, so the user's timezone controls status", async () => {
    const user = await createUser();
    const property = await createProperty(user.id, propertyInput());
    await setUpChecks(user.id, property.id, "2026-09-22", { gas: { choice: "unknown" } });

    const beforeMidnight = await getPropertySchedule(user.id, property.id, "2026-09-22");
    const afterMidnight = await getPropertySchedule(user.id, property.id, "2026-09-23");
    expect(beforeMidnight!.items[2].status).toBe("due");
    expect(afterMidnight!.items[2]).toMatchObject({ status: "overdue", label: "Overdue by 1 day" });
  });
});
