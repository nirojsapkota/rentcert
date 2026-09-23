import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/lib/auth-errors";

describe("authErrorMessage", () => {
  it("maps known codes to plain sentences", () => {
    expect(authErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 })).toMatch(/don't match/);
  });

  it("reports rate limiting", () => {
    expect(authErrorMessage({ status: 429 })).toMatch(/Too many attempts/);
  });

  it("never shows raw technical messages for unknown codes", () => {
    expect(authErrorMessage({ code: "SOMETHING_INTERNAL", message: "ECONNREFUSED", status: 500 })).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
