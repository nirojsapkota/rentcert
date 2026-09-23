import { describe, expect, it } from "vitest";
import { addYears, formatCalendarDate, parseCalendarDate, toCalendarDateString, todayIn } from "@/lib/calendar-date";

describe("parseCalendarDate", () => {
  it("parses a valid date at UTC midnight", () => {
    expect(parseCalendarDate("2024-10-12")?.toISOString()).toBe("2024-10-12T00:00:00.000Z");
  });

  it("accepts 29 February only in leap years", () => {
    expect(parseCalendarDate("2024-02-29")).not.toBeNull();
    expect(parseCalendarDate("2025-02-29")).toBeNull();
  });

  it("rejects other formats", () => {
    expect(parseCalendarDate("12/10/2024")).toBeNull();
    expect(parseCalendarDate("2024-13-01")).toBeNull();
    expect(parseCalendarDate("")).toBeNull();
  });
});

describe("formatting", () => {
  it("formats in en-AU without shifting the day", () => {
    const date = parseCalendarDate("2024-10-12")!;
    expect(formatCalendarDate(date)).toBe("12 October 2024");
    expect(toCalendarDateString(date)).toBe("2024-10-12");
  });
});

describe("todayIn", () => {
  it("uses the given timezone", () => {
    // 23:30 UTC on 22 September is already 23 September in Melbourne.
    const instant = new Date("2026-09-22T23:30:00Z");
    expect(todayIn("Australia/Melbourne", instant)).toBe("2026-09-23");
    expect(todayIn("UTC", instant)).toBe("2026-09-22");
  });
});

describe("addYears", () => {
  it("adds calendar years", () => {
    expect(addYears("2026-09-23", 2)).toBe("2028-09-23");
  });

  it("moves 29 February to 28 February in a non-leap year", () => {
    expect(addYears("2024-02-29", 1)).toBe("2025-02-28");
  });
});
