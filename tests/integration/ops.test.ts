import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as health } from "@/app/api/health/route";
import { db } from "@/server/db";
import { testOutbox } from "@/server/mail/deliver";
import { recordWorkerHeartbeat } from "@/server/ops/health";
import { checkJobHealth } from "@/server/ops/job-health";
import { callAuth, createVerifiedUser, VALID_PASSWORD } from "../support/auth-http";
import { createUser, insertProperty } from "../support/factories";

afterEach(async () => {
  vi.unstubAllEnvs();
  await db.appSetting.deleteMany({ where: { key: { in: ["worker_heartbeat", "last_job_alert_at"] } } });
});

describe("health", () => {
  it("reports ok without worker checks outside production", async () => {
    const response = await health();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("reports degraded when the worker heartbeat is missing or stale, with no detail", async () => {
    vi.stubEnv("HEALTH_CHECK_WORKER", "true");
    const missing = await health();
    expect(missing.status).toBe(503);
    expect(await missing.json()).toEqual({ status: "degraded" });

    await recordWorkerHeartbeat(new Date(Date.now() - 11 * 60 * 1000));
    expect((await health()).status).toBe(503);

    await recordWorkerHeartbeat();
    expect((await health()).status).toBe(200);
  });

  it("lets the proxy check only the web process with ?scope=web", async () => {
    vi.stubEnv("HEALTH_CHECK_WORKER", "true");
    expect((await health(new Request("http://localhost/api/health?scope=web"))).status).toBe(200);
    expect((await health(new Request("http://localhost/api/health"))).status).toBe(503);
  });
});

describe("job health alerts", () => {
  it("alerts once for failed reminders, then waits 6 hours", async () => {
    vi.stubEnv("ALERT_EMAIL", "ops@example.com");
    await recordWorkerHeartbeat();
    const user = await createUser();
    const property = await insertProperty(user.id);
    const record = await db.complianceRecord.create({
      data: {
        propertyId: property.id,
        requirementId: (await db.complianceRequirement.findFirstOrThrow({ where: { jurisdiction: "VIC", code: "gas" } })).id,
        kind: "COMPLETED",
        completedOn: new Date("2025-01-01T00:00:00Z"),
        nextDueOn: new Date("2027-01-01T00:00:00Z"),
      },
    });
    await db.complianceReminder.create({ data: { complianceRecordId: record.id, reminderType: "DAYS_30", scheduledFor: new Date("2026-12-02T00:00:00Z"), status: "FAILED", attempts: 5 } });

    const first = await checkJobHealth();
    expect(first).toMatchObject({ alerted: true, health: { failedReminders: 1, heartbeatStale: false } });
    expect(testOutbox.map((mail) => [mail.to, mail.subject])).toEqual([["ops@example.com", "RentCert: background job alert"]]);
    expect(testOutbox[0].text).not.toContain(user.email);

    expect((await checkJobHealth()).alerted).toBe(false);
    expect((await checkJobHealth(new Date(Date.now() + 7 * 60 * 60 * 1000))).alerted).toBe(true);
  });

  it("stays quiet when everything is healthy", async () => {
    await recordWorkerHeartbeat();
    expect(await checkJobHealth()).toEqual({ alerted: false, health: { failedReminders: 0, failedJobs: 0, heartbeatStale: false } });
  });
});

describe("trusted client IP", () => {
  it("rate-limits by the proxy-appended address, so a spoofed X-Forwarded-For cannot dodge limits", async () => {
    await createVerifiedUser("target@example.com");
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      // The attacker rotates the leftmost value; the proxy appends the real address last.
      const response = await callAuth("/sign-in/email", {
        body: { email: "target@example.com", password: "wrong password!!" },
        ip: `10.9.${i}.1, 198.51.100.77`,
      });
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 5).every((status) => status === 401)).toBe(true);
    expect(statuses[5]).toBe(429);

    // A different real client is unaffected.
    const other = await callAuth("/sign-in/email", { body: { email: "target@example.com", password: VALID_PASSWORD }, ip: "203.0.113.200" });
    expect(other.status).toBe(200);
  });
});
