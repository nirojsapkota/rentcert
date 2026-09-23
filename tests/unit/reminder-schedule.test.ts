import { describe, expect, it } from "vitest";
import { dueReminder, localHour } from "@/server/reminders/schedule";

const base = { nextDueOn: "2026-10-31", recordCreatedOn: "2025-10-31", localHour: 9 };

describe("dueReminder", () => {
  it.each([
    ["2026-09-30", null],
    ["2026-10-01", { type: "DAYS_30", scheduledFor: "2026-10-01" }],
    ["2026-10-23", { type: "DAYS_30", scheduledFor: "2026-10-01" }],
    ["2026-10-24", { type: "DAYS_7", scheduledFor: "2026-10-24" }],
    ["2026-10-30", { type: "DAYS_7", scheduledFor: "2026-10-24" }],
    ["2026-10-31", { type: "DUE_DATE", scheduledFor: "2026-10-31" }],
    ["2026-11-06", { type: "DUE_DATE", scheduledFor: "2026-10-31" }],
    ["2026-11-07", { type: "OVERDUE_7", scheduledFor: "2026-11-07" }],
    ["2027-03-01", { type: "OVERDUE_7", scheduledFor: "2026-11-07" }],
  ])("on %s returns %j", (today, expected) => {
    expect(dueReminder({ ...base, today })).toEqual(expected);
  });

  it("sends only the latest type after a gap (no catch-up spam)", () => {
    expect(dueReminder({ ...base, today: "2026-11-02" })?.type).toBe("DUE_DATE");
  });

  it("never sends a reminder dated on or before the day the record was created", () => {
    // Entered today with a due date 3 days ago: nothing until the overdue follow-up.
    expect(dueReminder({ nextDueOn: "2026-09-20", recordCreatedOn: "2026-09-23", today: "2026-09-23", localHour: 9 })).toBeNull();
    expect(dueReminder({ nextDueOn: "2026-09-20", recordCreatedOn: "2026-09-23", today: "2026-09-27", localHour: 9 })?.type).toBe("OVERDUE_7");
    // "I don't know" at setup: due the same day, so no "due today" email.
    expect(dueReminder({ nextDueOn: "2026-09-23", recordCreatedOn: "2026-09-23", today: "2026-09-23", localHour: 9 })).toBeNull();
  });

  it("waits until 08:00 local time", () => {
    expect(dueReminder({ ...base, today: "2026-10-31", localHour: 7 })).toBeNull();
    expect(dueReminder({ ...base, today: "2026-10-31", localHour: 8 })?.type).toBe("DUE_DATE");
  });
});

describe("localHour", () => {
  it("reads the hour in the user's timezone", () => {
    const instant = new Date("2026-09-22T21:30:00Z");
    expect(localHour(instant, "Australia/Melbourne")).toBe(7);
    expect(localHour(instant, "Australia/Perth")).toBe(5);
    expect(localHour(instant, "UTC")).toBe(21);
  });
});
