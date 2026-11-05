import { describe, expect, it } from "vitest";
import { councilSchema, lodgeNotice } from "@/lib/council";

describe("council wording", () => {
  it("warns when a council is unverified", () => {
    expect(lodgeNotice(null)).toBe("Not yet verified. Check with the council.");
  });

  it("says when the information was last checked, never authoritative", () => {
    const text = lodgeNotice(new Date("2026-10-13T00:00:00Z"));
    expect(text).toContain("Based on information we last checked on 13/10/2026");
    expect(text).toContain("Check with the council");
  });

  it("only accepts https links", () => {
    const base = { lodgementMethod: "PORTAL", contactEmail: "", contactPhone: "", notes: "", sourceUrl: "" };
    expect(councilSchema.safeParse({ ...base, portalUrl: "http://example.com" }).success).toBe(false);
    expect(councilSchema.safeParse({ ...base, portalUrl: "https://example.gov.au" }).success).toBe(true);
  });
});
