import { describe, expect, it } from "vitest";
import { CompliancePackGenerator, PACK_DISCLAIMER } from "@/server/compliance-pack/generator";
import type { PackData } from "@/server/compliance-pack/load";
import { flat, pdfPages } from "../support/pdf-text";

function packData(overrides: Partial<PackData> = {}): PackData {
  return {
    generatedOn: "23 September 2026",
    generatedOnIso: "2026-09-23",
    property: {
      id: "p1",
      street: "12 Smith Street",
      locality: "Narre Warren VIC 3805",
      state: "VIC",
      nickname: null,
      leaseStart: "12 October 2024",
      archived: false,
    },
    isGeneric: false,
    summary: [
      { name: "Smoke alarm check", status: "Due in 18 days", lastCompleted: "11 October 2025", nextDue: "11 October 2026", source: "Consumer Affairs Victoria (interval not yet verified)" },
      { name: "Electrical safety check", status: "Due in 92 days", lastCompleted: "24 December 2024", nextDue: "24 December 2026", source: null },
      { name: "Gas safety check", status: "Overdue by 21 days", lastCompleted: "2 September 2024", nextDue: "2 September 2026", source: null },
    ],
    history: [
      { requirement: "Gas safety check", completed: "2 September 2024", nextDue: "2 September 2026", provider: "ABC Safety", licence: "GF-1234" },
      { requirement: "Electrical safety check", completed: "Last check unknown", nextDue: "24 December 2024", provider: "—", licence: "—" },
    ],
    documents: [
      { filename: "Gas certificate 2024.pdf", requirement: "Gas safety check", recordCompleted: "2 September 2024", uploaded: "3 September 2024", size: "210 KB", fingerprint: "9f86d081884c7d65" },
    ],
    ...overrides,
  };
}

describe("CompliancePackGenerator", () => {
  it("produces a valid PDF with every section (scenario 7 content)", async () => {
    const pdf = await new CompliancePackGenerator(packData()).generate();
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");

    const pages = await pdfPages(pdf);
    const text = flat(pages);
    expect(pages[0]).toContain("RentCert Compliance Pack");
    expect(flat([pages[0]])).toContain("12 Smith Street Narre Warren VIC 3805");
    expect(flat([pages[0]])).toContain("Generated: 23 September 2026");
    for (const expected of [
      "Property details",
      "Lease start 12 October 2024",
      "Smoke alarm check 11 October 2025 11 October 2026 Due in 18 days",
      "Gas safety check 2 September 2024 2 September 2026 Overdue by 21 days",
      "Gas safety check 2 September 2024 2 September 2026 ABC Safety GF-1234",
      "Last check unknown",
      "Gas certificate 2024.pdf",
      "9f86d081884c7d65",
      "interval not yet verified",
    ]) {
      expect(text).toContain(expected);
    }
  });

  it("puts the disclaimer and page numbers on every page, across several pages", async () => {
    const history = Array.from({ length: 120 }, (_, i) => ({
      requirement: "Smoke alarm check",
      completed: `${(i % 28) + 1} March ${1990 + (i % 30)}`,
      nextDue: "1 March 2031",
      provider: `Provider ${i}`,
      licence: `L-${i}`,
    }));
    const pages = await pdfPages(await new CompliancePackGenerator(packData({ history })).generate());

    expect(pages.length).toBeGreaterThan(3);
    pages.forEach((page, index) => {
      const text = flat([page]);
      expect(text).toContain(PACK_DISCLAIMER);
      expect(text).toContain(`Page ${index + 1} of ${pages.length}`);
    });
    expect(flat(pages)).toContain("Provider 119");
    // The table header repeats on continuation pages.
    expect(flat([pages[2]])).toContain("Requirement Completed Next due Provider Licence");
  });

  it("prints names in Latin, Vietnamese, Greek and Cyrillic", async () => {
    const pdf = await new CompliancePackGenerator(
      packData({ history: [{ requirement: "Gas safety check", completed: "1 May 2025", nextDue: "1 May 2027", provider: "Nguyễn Văn Ánh · Ελένη · Иван", licence: "—" }] }),
    ).generate();
    expect(flat(await pdfPages(pdf))).toContain("Nguyễn Văn Ánh · Ελένη · Иван");
  });

  it("labels the general schedule for other states and makes no legal claims", async () => {
    const pages = await pdfPages(
      await new CompliancePackGenerator(
        packData({ isGeneric: true, property: { ...packData().property, state: "NSW", locality: "Parramatta NSW 2150" } }),
      ).generate(),
    );
    const text = flat(pages);
    expect(text).toContain("General reminder schedule: RentCert has not yet researched NSW rules.");
    expect(text.replace(/does not confirm legal compliance/g, "")).not.toMatch(/\bcompliant\b|certified|guarantee|legally compliant/i);
  });
});
