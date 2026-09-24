import "server-only";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/server/db";
import { logger } from "@/server/logger";
import { deliver } from "@/server/mail/deliver";
import { countFailedReminders } from "@/server/reminders/queries";
import { BACKUP_MAX_AGE_MS, latestBackupAge, type BackupLister } from "@/server/ops/backups";
import { HEARTBEAT_MAX_AGE_MS, workerHeartbeatAge } from "@/server/ops/health";

const LAST_ALERT_KEY = "last_job_alert_at";
const ALERT_EVERY_MS = 6 * 60 * 60 * 1000;

export type JobHealth = { failedReminders: number; failedJobs: number; heartbeatStale: boolean; backupStale: boolean };

export async function collectJobHealth(now: Date = new Date(), listBackups?: BackupLister): Promise<JobHealth> {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [failedReminders, failedJobs, heartbeatAge, backupAge] = await Promise.all([
    countFailedReminders(since),
    db.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) AS count FROM pgboss.job WHERE state = 'failed' AND completed_on >= ${since}`
      .then((rows) => Number(rows[0]?.count ?? 0))
      .catch(() => 0), // pg-boss schema not created yet (tests, first boot)
    workerHeartbeatAge(now),
    latestBackupAge(now, listBackups).catch(() => null), // unreadable bucket counts as stale
  ]);
  return {
    failedReminders,
    failedJobs,
    heartbeatStale: heartbeatAge === null || heartbeatAge > HEARTBEAT_MAX_AGE_MS,
    // undefined: backups not configured (development). null: configured but none found.
    backupStale: backupAge !== undefined && (backupAge === null || backupAge > BACKUP_MAX_AGE_MS),
  };
}

// Hourly: alert on failed reminders, failed jobs or a stale worker, at most every 6 hours.
export async function checkJobHealth(now: Date = new Date(), listBackups?: BackupLister): Promise<{ alerted: boolean; health: JobHealth }> {
  const health = await collectJobHealth(now, listBackups);
  const unhealthy = health.failedReminders > 0 || health.failedJobs > 0 || health.heartbeatStale || health.backupStale;
  if (!unhealthy) return { alerted: false, health };

  const last = await db.appSetting.findUnique({ where: { key: LAST_ALERT_KEY } });
  if (typeof last?.value === "string" && now.getTime() - new Date(last.value).getTime() < ALERT_EVERY_MS) {
    return { alerted: false, health };
  }
  await db.appSetting.upsert({
    where: { key: LAST_ALERT_KEY },
    create: { key: LAST_ALERT_KEY, value: now.toISOString() },
    update: { value: now.toISOString() },
  });

  const summary = `RentCert job health: ${health.failedReminders} failed reminders and ${health.failedJobs} failed jobs in the last 24 hours; worker heartbeat ${health.heartbeatStale ? "STALE" : "ok"}; database backup ${health.backupStale ? "STALE (none in the last 2 hours)" : "ok"}.`;
  logger.warn({ module: "ops", ...health }, "job health alert");
  Sentry.captureMessage(summary, "warning");
  const to = process.env.ALERT_EMAIL;
  if (to) {
    await deliver({ to, subject: "RentCert: background job alert", text: summary, html: `<p>${summary}</p>` });
  }
  return { alerted: true, health };
}
