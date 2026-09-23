// Background worker: `npm run worker`. Runs queued jobs and the recurring schedules.
import * as Sentry from "@sentry/node";
import { PgBoss } from "pg-boss";
import { sharedSentryOptions } from "@/lib/sentry-options";
import { runJob } from "@/server/jobs/handlers";
import { JOBS, RETRY_OPTIONS, type JobName } from "@/server/jobs/names";
import { errorName, logger } from "@/server/logger";

if (process.env.SENTRY_DSN) Sentry.init({ dsn: process.env.SENTRY_DSN, ...sharedSentryOptions });

async function main() {
  const boss = new PgBoss({ connectionString: process.env.DATABASE_URL });
  boss.on("error", (error) => {
    logger.error({ module: "worker", error: errorName(error) }, "pg-boss error");
    Sentry.captureException(error);
  });
  await boss.start();

  const enqueue = async (name: JobName, data: Record<string, string>) => {
    await boss.send(name, data, RETRY_OPTIONS);
  };

  for (const name of Object.values(JOBS)) {
    await boss.createQueue(name, RETRY_OPTIONS);
    await boss.work<Record<string, string>>(name, async (jobs) => {
      for (const job of jobs) {
        try {
          await runJob(name, job.data, enqueue);
        } catch (error) {
          logger.error({ module: "worker", job: name, error: errorName(error) }, "job failed");
          Sentry.captureException(error, { tags: { job: name } });
          throw error; // pg-boss retries with backoff
        }
      }
    });
  }

  // Hourly scan: each user's reminders go out from 08:00 in their own timezone.
  await boss.schedule(JOBS.scanReminders, "5 * * * *", {}, { tz: "UTC" });
  await boss.schedule(JOBS.cleanupFiles, "30 3 * * *", {}, { tz: "Australia/Melbourne" });
  await boss.schedule(JOBS.heartbeat, "* * * * *", {}, { tz: "UTC" });
  await boss.schedule(JOBS.checkJobHealth, "15 * * * *", {}, { tz: "UTC" });
  logger.info({ module: "worker" }, "worker started");

  const shutdown = async () => {
    logger.info({ module: "worker" }, "worker stopping");
    await boss.stop({ graceful: true, timeout: 30_000 });
    await Sentry.flush(2000);
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((error) => {
  logger.fatal({ module: "worker", error: errorName(error) }, "worker failed to start");
  process.exit(1);
});
