import { describe, expect, it } from "vitest";
import { isValidTimezone, passwordSchema, profileSchema, signUpSchema } from "@/lib/account-validation";

describe("signUpSchema", () => {
  const valid = { firstName: "Alex", lastName: "Nguyen", email: "Alex@Example.com ", password: "a".repeat(12) };

  it("normalises email to lower case without spaces", () => {
    expect(signUpSchema.parse(valid).email).toBe("alex@example.com");
  });

  it("rejects a password shorter than 12 characters", () => {
    const result = passwordSchema.safeParse("a".repeat(11));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Use at least 12 characters.");
  });

  it("rejects a blank first name", () => {
    expect(signUpSchema.safeParse({ ...valid, firstName: "   " }).success).toBe(false);
  });
});

describe("profileSchema", () => {
  const valid = { firstName: "Alex", lastName: "Nguyen", timezone: "Australia/Melbourne", notificationEmail: "" };

  it("treats a blank notification email as not set", () => {
    expect(profileSchema.parse(valid).notificationEmail).toBeNull();
  });

  it("rejects an unknown timezone", () => {
    expect(profileSchema.safeParse({ ...valid, timezone: "Mars/Olympus" }).success).toBe(false);
  });
});

describe("isValidTimezone", () => {
  it("accepts IANA zone names", () => {
    expect(isValidTimezone("Australia/Melbourne")).toBe(true);
    expect(isValidTimezone("not a zone")).toBe(false);
  });
});
