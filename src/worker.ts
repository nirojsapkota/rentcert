// Background worker: `npm run worker`. Runs queued jobs and the recurring schedules.
import { PgBoss } from "pg-boss";
import { runJob } from "@/server/jobs/handlers";
import { JOBS, RETRY_OPTIONS, type JobName } from "@/server/jobs/names";

async function main() {
  const boss = new PgBoss({ connectionString: process.env.DATABASE_URL });
  boss.on("error", (error) => console.error("[worker] pg-boss error", error.name));
  await boss.start();

  const enqueue = async (name: JobName, data: Record<string, string>) => {
    await boss.send(name, data, RETRY_OPTIONS);
  };

  for (const name of Object.values(JOBS)) {
    await boss.createQueue(name, RETRY_OPTIONS);
    await boss.work<Record<string, string>>(name, async (jobs) => {
      for (const job of jobs) await runJob(name, job.data, enqueue);
    });
  }

  // Hourly scan: each user's reminders go out from 08:00 in their own timezone.
  await boss.schedule(JOBS.scanReminders, "5 * * * *", {}, { tz: "UTC" });
  await boss.schedule(JOBS.cleanupFiles, "30 3 * * *", {}, { tz: "Australia/Melbourne" });
  console.info("[worker] started");

  const shutdown = async () => {
    console.info("[worker] stopping");
    await boss.stop({ graceful: true, timeout: 30_000 });
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((error) => {
  console.error("[worker] failed to start", error);
  process.exit(1);
});
