import { Writable } from "node:stream";
import type { ErrorEvent } from "@sentry/core";
import { describe, expect, it } from "vitest";
import { beforeSend } from "@/lib/sentry-options";
import { scrub } from "@/lib/scrub";
import { createLogger } from "@/server/logger";
import { buildCsp } from "@/proxy";

describe("scrub", () => {
  it("removes emails, signed URLs, storage keys and secrets", () => {
    const text = scrub(
      "sent to landlord@example.com via https://b.s3.amazonaws.com/x?X-Amz-Signature=abc key documents/u_1/0192f0a4-5b6c-7d8e-9f00-112233445566 token=eyJhbGciOi password=hunter2",
    );
    expect(text).not.toMatch(/landlord@example\.com|X-Amz-Signature|0192f0a4|eyJhbGciOi|hunter2/);
    expect(text).toContain("[email]");
    expect(text).toContain("[signed-url]");
    expect(text).toContain("[storage-key]");
  });
});

describe("logger", () => {
  it("redacts sensitive fields and scrubs messages", () => {
    const lines: string[] = [];
    const sink = new Writable({ write(chunk, _encoding, done) { lines.push(chunk.toString()); done(); } });
    const logger = createLogger(sink);
    logger.level = "info";

    logger.info({ module: "test", email: "a@example.com", headers: { cookie: "session=abc" }, token: "secret", storageKey: "documents/x/y" }, "mail to a@example.com failed");

    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({ level: "info", module: "test", email: "[redacted]", token: "[redacted]", storageKey: "[redacted]", msg: "mail to [email] failed" });
    expect(entry.headers.cookie).toBe("[redacted]");
    expect(lines[0]).not.toContain("a@example.com");
    expect(lines[0]).not.toContain("session=abc");
  });
});

describe("Sentry beforeSend", () => {
  it("drops request data and personal details", () => {
    const event = beforeSend({
      type: undefined,
      message: "failed for landlord@example.com",
      request: { url: "https://rentcert.example/reset-password?token=abc", cookies: { session: "x" }, headers: { cookie: "x" }, query_string: "token=abc", data: "password=1" },
      user: { id: "user_1", email: "landlord@example.com", ip_address: "1.2.3.4" },
      exception: { values: [{ type: "Error", value: "No user landlord@example.com" }] },
    } as ErrorEvent)!;

    expect(event.request).toEqual({ url: "https://rentcert.example/reset-password" });
    expect(event.user).toEqual({ id: "user_1" });
    expect(event.message).toBe("failed for [email]");
    expect(event.exception?.values?.[0].value).toBe("No user [email]");
  });
});

describe("Content-Security-Policy", () => {
  it("allows scripts only with the nonce in production", () => {
    const csp = buildCsp("abc123", false);
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(buildCsp("n", true)).toContain("'unsafe-eval'");
  });
});
