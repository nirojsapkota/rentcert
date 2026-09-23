import { describe, expect, it } from "vitest";
import { greetingFor } from "@/lib/greeting";

describe("greetingFor", () => {
  // 2026-09-22T21:30Z is 7:30am on 23 September in Melbourne (AEST, UTC+10).
  const instant = new Date("2026-09-22T21:30:00Z");

  it("uses the user's timezone, not UTC", () => {
    expect(greetingFor(instant, "Australia/Melbourne")).toBe("Good morning");
    expect(greetingFor(instant, "UTC")).toBe("Good evening");
  });

  it("switches to afternoon at noon local time", () => {
    expect(greetingFor(new Date("2026-09-23T02:00:00Z"), "Australia/Melbourne")).toBe("Good afternoon");
  });
});
