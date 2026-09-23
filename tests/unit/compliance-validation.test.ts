import { describe, expect, it } from "vitest";
import { completionSchema, parseSetupAnswers } from "@/lib/compliance-validation";

const TODAY = "2026-09-23";

describe("completionSchema", () => {
  const schema = completionSchema(TODAY);

  it("requires a completed date that is not in the future", () => {
    expect(schema.safeParse({ completedOn: "", providerName: "", providerLicenceNumber: "", notes: "" }).error?.issues[0].message).toBe(
      "Enter the date the check was completed.",
    );
    expect(schema.safeParse({ completedOn: "2026-09-24", providerName: "", providerLicenceNumber: "", notes: "" }).error?.issues[0].message).toBe(
      "The date can't be in the future.",
    );
    expect(schema.parse({ completedOn: TODAY, providerName: " ABC Safety ", providerLicenceNumber: "", notes: "" })).toEqual({
      completedOn: TODAY,
      providerName: "ABC Safety",
      providerLicenceNumber: null,
      notes: null,
    });
  });
});

describe("parseSetupAnswers", () => {
  const codes = ["smoke_alarm", "electrical", "gas"];

  it("parses one answer per requirement", () => {
    const form: Record<string, string> = {
      choice_smoke_alarm: "date",
      date_smoke_alarm: "2026-01-10",
      choice_electrical: "unknown",
      choice_gas: "not_applicable",
    };
    expect(parseSetupAnswers(codes, (name) => form[name] ?? "", TODAY)).toEqual({
      ok: true,
      answers: {
        smoke_alarm: { choice: "date", lastCheckOn: "2026-01-10" },
        electrical: { choice: "unknown" },
        gas: { choice: "not_applicable" },
      },
    });
  });

  it("reports a missing date and a missing choice per requirement", () => {
    const form: Record<string, string> = { choice_smoke_alarm: "date", date_smoke_alarm: "", choice_gas: "unknown" };
    expect(parseSetupAnswers(codes, (name) => form[name] ?? "", TODAY)).toEqual({
      ok: false,
      errors: { smoke_alarm: "Enter the last check date, or choose another option.", electrical: "Choose an option." },
    });
  });
});
