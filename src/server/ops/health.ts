import "server-only";
import { db } from "@/server/db";

export const HEARTBEAT_KEY = "worker_heartbeat";
export const HEARTBEAT_MAX_AGE_MS = 10 * 60 * 1000;

// Written by the worker every minute. Proves the worker is running and processing jobs.
export async function recordWorkerHeartbeat(now: Date = new Date()) {
  await db.appSetting.upsert({
    where: { key: HEARTBEAT_KEY },
    create: { key: HEARTBEAT_KEY, value: now.toISOString() },
    update: { value: now.toISOString() },
  });
}

export async function workerHeartbeatAge(now: Date = new Date()): Promise<number | null> {
  const row = await db.appSetting.findUnique({ where: { key: HEARTBEAT_KEY } });
  if (typeof row?.value !== "string") return null;
  return now.getTime() - new Date(row.value).getTime();
}

// Health for the load balancer and uptime checks. Returns no detail beyond ok/degraded.
// The worker check applies only where a worker is expected (HEALTH_CHECK_WORKER=true in production).
export async function checkHealth(now: Date = new Date()): Promise<"ok" | "degraded"> {
  await db.$queryRaw`SELECT 1`;
  if (process.env.HEALTH_CHECK_WORKER === "true") {
    const age = await workerHeartbeatAge(now);
    if (age === null || age > HEARTBEAT_MAX_AGE_MS) return "degraded";
  }
  return "ok";
}
