import { describe, expect, it } from "vitest";
import { addDays, addMonths, daysBetween } from "@/lib/calendar-date";
import { nextDueOn } from "@/server/compliance/due-date";
import { complianceStatus, statusLabel } from "@/server/compliance/status";

describe("addMonths", () => {
  it.each([
    ["2024-02-29", 12, "2025-02-28"],
    ["2024-02-29", 48, "2028-02-29"],
    ["2025-08-31", 6, "2026-02-28"],
    ["2026-01-31", 1, "2026-02-28"],
    ["2026-09-23", 12, "2027-09-23"],
    ["2026-09-23", 24, "2028-09-23"],
    ["2026-12-15", 1, "2027-01-15"],
    ["2027-03-31", -1, "2027-02-28"],
    ["2026-09-23", -12, "2025-09-23"],
  ])("%s + %i months = %s", (from, months, expected) => {
    expect(addMonths(from, months)).toBe(expected);
  });
});

describe("daysBetween / addDays", () => {
  it("counts calendar days across a leap day and a DST change", () => {
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2);
    expect(daysBetween("2026-10-03", "2026-10-05")).toBe(2); // Victoria DST starts 4 Oct 2026
    expect(daysBetween("2026-09-23", "2026-09-20")).toBe(-3);
    expect(addDays("2026-09-23", 30)).toBe("2026-10-23");
  });
});

describe("nextDueOn", () => {
  it("uses the recurrence in months, not 365-day years", () => {
    expect(nextDueOn("2024-02-29", 12)).toBe("2025-02-28");
    expect(nextDueOn("2025-01-01", 24)).toBe("2027-01-01");
    expect(nextDueOn("2023-03-01", 12)).toBe("2024-03-01"); // 366 days later
  });

  it("rejects a non-positive interval", () => {
    expect(() => nextDueOn("2025-01-01", 0)).toThrow();
  });
});

describe("complianceStatus", () => {
  const today = "2026-09-23";

  it.each([
    ["2026-09-22", "overdue", "Overdue by 1 day"],
    ["2026-09-01", "overdue", "Overdue by 22 days"],
    ["2026-09-23", "due", "Due today"],
    ["2026-09-24", "due_soon", "Due in 1 day"],
    ["2026-10-23", "due_soon", "Due in 30 days"],
    ["2026-10-24", "upcoming", "Due in 31 days"],
  ])("next due %s is %s", (nextDue, status, label) => {
    expect(complianceStatus(nextDue, today, 30)).toBe(status);
    expect(statusLabel(nextDue, today)).toBe(label);
  });

  it("honours a configured window", () => {
    expect(complianceStatus("2026-10-10", today, 7)).toBe("upcoming");
    expect(complianceStatus("2026-09-30", today, 7)).toBe("due_soon");
  });
});
