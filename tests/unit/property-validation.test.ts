import { describe, expect, it } from "vitest";
import { propertySchema } from "@/lib/property-validation";

const TODAY = "2026-09-23";
const schema = propertySchema(TODAY);

const valid = {
  addressLine1: " 12 Example Street ",
  addressLine2: "",
  suburb: "Narre Warren",
  state: "VIC",
  postcode: "3805",
  nickname: "",
  notes: "",
  leaseStartDate: "2024-10-12",
};

function firstError(input: Record<string, string>) {
  const result = schema.safeParse(input);
  return result.success ? undefined : result.error.issues[0].message;
}

describe("propertySchema", () => {
  it("trims text and turns blank optional fields into null", () => {
    expect(schema.parse(valid)).toEqual({
      addressLine1: "12 Example Street",
      addressLine2: null,
      suburb: "Narre Warren",
      state: "VIC",
      postcode: "3805",
      nickname: null,
      notes: null,
      leaseStartDate: "2024-10-12",
    });
  });

  it("accepts every Australian state and territory", () => {
    for (const state of ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"]) {
      expect(schema.safeParse({ ...valid, state }).success).toBe(true);
    }
  });

  it("rejects an unknown state", () => {
    expect(firstError({ ...valid, state: "XX" })).toBe("Choose a state or territory.");
    expect(firstError({ ...valid, state: "" })).toBe("Choose a state or territory.");
  });

  it("accepts any 4-digit postcode from 0200", () => {
    for (const postcode of ["0200", "0800", "2000", "3805", "6000", "9999"]) {
      expect(schema.safeParse({ ...valid, postcode }).success).toBe(true);
    }
  });

  it("rejects malformed postcodes", () => {
    for (const postcode of ["123", "12345", "0100", "38O5", ""]) {
      expect(firstError({ ...valid, postcode })).toBe("Enter a 4-digit Australian postcode.");
    }
  });

  it("requires the street address and suburb", () => {
    expect(firstError({ ...valid, addressLine1: "  " })).toBe("Enter the street address.");
    expect(firstError({ ...valid, suburb: "" })).toBe("Enter the suburb.");
  });

  it("allows suburbs with apostrophes, hyphens and spaces only", () => {
    expect(schema.safeParse({ ...valid, suburb: "O'Connor" }).success).toBe(true);
    expect(schema.safeParse({ ...valid, suburb: "Kew-East" }).success).toBe(true);
    expect(firstError({ ...valid, suburb: "<script>" })).toMatch(/letters/);
  });

  it("limits field lengths", () => {
    expect(firstError({ ...valid, addressLine1: "a".repeat(101) })).toMatch(/100 characters/);
    expect(firstError({ ...valid, notes: "a".repeat(2001) })).toMatch(/2,000 characters/);
    expect(firstError({ ...valid, nickname: "a".repeat(61) })).toMatch(/60 characters/);
  });

  it("makes the lease start date optional", () => {
    expect(schema.parse({ ...valid, leaseStartDate: "" }).leaseStartDate).toBeNull();
  });

  it("bounds the lease start date between 1990 and 2 years from today", () => {
    expect(schema.safeParse({ ...valid, leaseStartDate: "1990-01-01" }).success).toBe(true);
    expect(schema.safeParse({ ...valid, leaseStartDate: "2028-09-23" }).success).toBe(true);
    expect(firstError({ ...valid, leaseStartDate: "1989-12-31" })).toBe("Enter a valid lease start date.");
    expect(firstError({ ...valid, leaseStartDate: "2028-09-24" })).toBe("Enter a valid lease start date.");
    expect(firstError({ ...valid, leaseStartDate: "2025-02-29" })).toBe("Enter a valid lease start date.");
  });
});
