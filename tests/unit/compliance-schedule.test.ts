import { describe, expect, it } from "vitest";
import { buildSchedule, type RecordSummary, type RequirementInfo } from "@/server/compliance/schedule";

const requirement = (code: string, months: number): RequirementInfo => ({
  id: code,
  code,
  jurisdiction: "VIC",
  name: code,
  description: "",
  recurrenceMonths: months,
  basis: "REQUIRED_INTERVAL",
  sourceName: null,
  sourceUrl: null,
  lastVerifiedAt: null,
});

const record = (code: string, completedOn: string | null, nextDueOn: string, createdAt = "2026-01-01T00:00:00Z"): RecordSummary => ({
  id: `${code}-${nextDueOn}`,
  code,
  kind: completedOn ? "COMPLETED" : "UNKNOWN_LAST_CHECK",
  completedOn: completedOn ? new Date(`${completedOn}T00:00:00Z`) : null,
  nextDueOn: new Date(`${nextDueOn}T00:00:00Z`),
  createdAt: new Date(createdAt),
});

const TODAY = "2026-09-23";
const requirements = [requirement("smoke_alarm", 12), requirement("electrical", 24), requirement("gas", 24)];

describe("buildSchedule", () => {
  it("marks excluded and not-set-up requirements", () => {
    const items = buildSchedule(requirements, new Set(["gas"]), [record("smoke_alarm", "2026-01-10", "2027-01-10")], TODAY);

    expect(items.map((item) => [item.requirement.code, item.status])).toEqual([
      ["smoke_alarm", "upcoming"],
      ["electrical", "not_set_up"],
      ["gas", "not_applicable"],
    ]);
    expect(items[0]).toMatchObject({ nextDueOn: "2027-01-10", lastCompletedOn: "2026-01-10", daysRemaining: 109 });
  });

  it("uses the latest next due date, so a backfilled older check never becomes current", () => {
    const items = buildSchedule(
      requirements,
      new Set(),
      [
        record("gas", "2026-09-01", "2028-09-01", "2026-09-01T00:00:00Z"),
        record("gas", "2023-05-01", "2025-05-01", "2026-09-20T00:00:00Z"), // entered later, but older
      ],
      TODAY,
    );
    const gas = items.find((item) => item.requirement.code === "gas")!;
    expect(gas).toMatchObject({ nextDueOn: "2028-09-01", lastCompletedOn: "2026-09-01", status: "upcoming" });
  });

  it("shows an unknown last check as due today with no completion date", () => {
    const items = buildSchedule(requirements, new Set(), [record("electrical", null, TODAY)], TODAY);
    const electrical = items.find((item) => item.requirement.code === "electrical")!;
    expect(electrical).toMatchObject({ status: "due", label: "Due today", lastCompletedOn: null, currentRecordKind: "UNKNOWN_LAST_CHECK" });
  });

  it("replaces an unknown starting point once a check is recorded", () => {
    const items = buildSchedule(
      requirements,
      new Set(),
      [record("electrical", null, "2026-09-01"), record("electrical", "2026-09-10", "2028-09-10")],
      TODAY,
    );
    expect(items.find((item) => item.requirement.code === "electrical")).toMatchObject({ status: "upcoming", nextDueOn: "2028-09-10" });
  });
});
