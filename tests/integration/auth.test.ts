import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { testOutbox } from "@/server/mail/deliver";
import {
  VALID_PASSWORD,
  callAuth,
  createVerifiedUser,
  lastLinkSentTo,
  sessionCookieFrom,
  signUp,
} from "../support/auth-http";

describe("sign up", () => {
  it("creates the account, sends a verification email and does not sign in", async () => {
    const response = await signUp();

    expect(response.status).toBe(200);
    expect(sessionCookieFrom(response.headers)).toBeUndefined();

    const user = await db.user.findUniqueOrThrow({ where: { email: "landlord@example.com" } });
    expect(user).toMatchObject({ firstName: "Alex", lastName: "Nguyen", name: "Alex Nguyen", emailVerified: false });
    expect(user.timezone).toBe("Australia/Melbourne");

    expect(testOutbox).toHaveLength(1);
    expect(testOutbox[0]).toMatchObject({ to: "landlord@example.com", subject: "Verify your email for RentCert" });

    const audit = await db.auditEvent.findMany({ where: { userId: user.id } });
    expect(audit.map((event) => event.action)).toEqual(["user.created"]);
  });

  it("does not reveal that an email is already registered", async () => {
    await signUp();
    const second = await signUp({ firstName: "Someone", lastName: "Else" });

    expect(second.status).toBe(200);
    expect(await db.user.count()).toBe(1);
  });

  it("rejects a password shorter than 12 characters", async () => {
    const response = await signUp({ password: "short-pass1" });

    expect(response.status).toBe(400);
    expect(response.json.code).toBe("PASSWORD_TOO_SHORT");
    expect(await db.user.count()).toBe(0);
  });

  it("rejects a blank first name with a readable message", async () => {
    const response = await signUp({ firstName: "  " });

    expect(response.status).toBe(400);
    expect(response.json.message).toBe("Enter your first name.");
    expect(await db.user.count()).toBe(0);
  });
});

describe("email verification", () => {
  it("blocks sign in until the email is verified", async () => {
    await signUp();
    const response = await callAuth("/sign-in/email", {
      body: { email: "landlord@example.com", password: VALID_PASSWORD },
    });

    expect(response.status).toBe(403);
    expect(response.json.code).toBe("EMAIL_NOT_VERIFIED");
    expect(sessionCookieFrom(response.headers)).toBeUndefined();
  });

  it("verifies the email from the emailed link", async () => {
    const { userId } = await createVerifiedUser();

    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.emailVerified).toBe(true);
    const actions = (await db.auditEvent.findMany({ where: { userId } })).map((event) => event.action);
    expect(actions).toContain("user.email_verified");
  });

  it("rejects a tampered verification token", async () => {
    await signUp();
    const response = await callAuth("/verify-email?token=not-a-real-token", { method: "GET" });

    expect(response.status).toBeGreaterThanOrEqual(400);
    const user = await db.user.findUniqueOrThrow({ where: { email: "landlord@example.com" } });
    expect(user.emailVerified).toBe(false);
  });
});

describe("password reset", () => {
  it("resets the password from the emailed link and revokes old sessions", async () => {
    const { cookie } = await createVerifiedUser();
    testOutbox.length = 0;

    await callAuth("/request-password-reset", {
      body: { email: "landlord@example.com", redirectTo: "/reset-password" },
    });
    const link = lastLinkSentTo("landlord@example.com");
    const token = link.pathname.split("/").pop();

    const newPassword = "a brand new long password";
    const reset = await callAuth("/reset-password", { body: { newPassword, token } });
    expect(reset.status).toBe(200);

    const oldSession = await callAuth("/get-session", { method: "GET", cookie });
    expect(oldSession.json).toBeNull();

    const withOld = await callAuth("/sign-in/email", { body: { email: "landlord@example.com", password: VALID_PASSWORD } });
    expect(withOld.status).toBe(401);
    const withNew = await callAuth("/sign-in/email", { body: { email: "landlord@example.com", password: newPassword } });
    expect(withNew.status).toBe(200);
  });

  it("gives the same response for an unknown email", async () => {
    const response = await callAuth("/request-password-reset", {
      body: { email: "nobody@example.com", redirectTo: "/reset-password" },
    });

    expect(response.status).toBe(200);
    expect(testOutbox).toHaveLength(0);
  });
});

describe("sign out", () => {
  it("ends the session", async () => {
    const { cookie } = await createVerifiedUser();

    await callAuth("/sign-out", { cookie, body: {} });

    const session = await callAuth("/get-session", { method: "GET", cookie });
    expect(session.json).toBeNull();
  });
});

describe("rate limiting", () => {
  it("blocks repeated failed sign-ins from one address", async () => {
    await createVerifiedUser();
    const attempt = () =>
      callAuth("/sign-in/email", { body: { email: "landlord@example.com", password: "wrong password!!" }, ip: "198.51.100.7" });

    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await attempt()).status);

    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses[5]).toBe(429);
  });
});

describe("account deletion", () => {
  it("deletes the user and dependent rows, keeping only a timestamp", async () => {
    const { cookie, userId } = await createVerifiedUser();

    const response = await callAuth("/delete-user", { cookie, body: { password: VALID_PASSWORD } });
    expect(response.status).toBe(200);

    expect(await db.user.count({ where: { id: userId } })).toBe(0);
    expect(await db.session.count({ where: { userId } })).toBe(0);
    expect(await db.account.count({ where: { userId } })).toBe(0);
    expect(await db.auditEvent.count({ where: { userId } })).toBe(0);
    expect(await db.accountDeletion.count()).toBe(1);
  });

  it("requires the correct password", async () => {
    const { cookie, userId } = await createVerifiedUser();

    const response = await callAuth("/delete-user", { cookie, body: { password: "not my password!!" } });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(await db.user.count({ where: { id: userId } })).toBe(1);
  });
});
