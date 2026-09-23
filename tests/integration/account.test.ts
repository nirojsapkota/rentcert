import { describe, expect, it } from "vitest";
import { findProfile, updateProfile } from "@/server/account";
import { db } from "@/server/db";
import { createVerifiedUser } from "../support/auth-http";

const input = { firstName: "Sam", lastName: "Lee", timezone: "Australia/Sydney", notificationEmail: "alerts@example.com" };

describe("updateProfile", () => {
  it("updates only the given user and records which fields changed", async () => {
    const alex = await createVerifiedUser("alex@example.com");
    const other = await createVerifiedUser("other@example.com");

    await updateProfile(alex.userId, input);

    expect(await findProfile(alex.userId)).toMatchObject(input);
    expect((await db.user.findUniqueOrThrow({ where: { id: alex.userId } })).name).toBe("Sam Lee");
    expect(await findProfile(other.userId)).toMatchObject({ firstName: "Alex", timezone: "Australia/Melbourne" });

    const event = await db.auditEvent.findFirstOrThrow({ where: { userId: alex.userId, action: "user.updated" } });
    expect(event.metadata).toEqual({ changedFields: ["firstName", "lastName", "timezone", "notificationEmail"] });
  });

  it("writes no audit event when nothing changed", async () => {
    const { userId } = await createVerifiedUser();
    const current = await findProfile(userId);

    await updateProfile(userId, {
      firstName: current.firstName,
      lastName: current.lastName,
      timezone: current.timezone,
      notificationEmail: current.notificationEmail,
    });

    expect(await db.auditEvent.count({ where: { userId, action: "user.updated" } })).toBe(0);
  });
});
