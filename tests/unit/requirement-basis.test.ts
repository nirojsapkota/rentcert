import { describe, expect, it } from "vitest";
import { basisLine } from "@/lib/requirement-basis";

describe("basisLine", () => {
  it.each([
    ["REQUIRED_INTERVAL", "VIC", 24, "Required every 2 years in VIC."],
    ["REQUIRED_INTERVAL", "NSW", 12, "Required every year in NSW."],
    ["BEFORE_EACH_TENANCY", "QLD", 12, "Required before each new or renewed tenancy in QLD. RentCert reminds you every year."],
    ["RECOMMENDED", "SA", 24, "Recommended every 2 years. Not a fixed legal interval in SA."],
    ["REQUIRED_INTERVAL", "GENERIC", 18, "General schedule: reminders every 18 months."],
  ] as const)("%s in %s every %i months", (basis, jurisdiction, months, expected) => {
    expect(basisLine(basis, jurisdiction, months)).toBe(expected);
  });

  it("never claims compliance", () => {
    for (const basis of ["REQUIRED_INTERVAL", "BEFORE_EACH_TENANCY", "RECOMMENDED"] as const) {
      expect(basisLine(basis, "WA", 12)).not.toMatch(/complian/i);
    }
  });
});
