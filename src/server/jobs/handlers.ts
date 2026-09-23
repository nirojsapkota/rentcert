import "server-only";
import { scanDueReminders } from "@/server/reminders/scan";
import { sendReminder } from "@/server/reminders/send";
import { sendWelcome } from "@/server/reminders/welcome";
import { checkJobHealth } from "@/server/ops/job-health";
import { recordWorkerHeartbeat } from "@/server/ops/health";
import { deleteOrphanedFiles } from "@/server/vault/cleanup";
import { JOBS, type JobName } from "./names";

type Enqueue = (name: JobName, data: Record<string, string>) => Promise<void>;

// Job bodies, shared by the pg-boss worker and the inline driver used in tests.
export async function runJob(name: JobName, data: Record<string, string>, enqueue: Enqueue): Promise<void> {
  switch (name) {
    case JOBS.scanReminders: {
      const claimed = await scanDueReminders();
      for (const reminderId of claimed) await enqueue(JOBS.sendReminder, { reminderId });
      return;
    }
    case JOBS.sendReminder:
      await sendReminder(data.reminderId);
      return;
    case JOBS.sendWelcome:
      await sendWelcome(data.userId);
      return;
    case JOBS.cleanupFiles:
      await deleteOrphanedFiles();
      return;
    case JOBS.heartbeat:
      await recordWorkerHeartbeat();
      return;
    case JOBS.checkJobHealth:
      await checkJobHealth();
      return;
  }
}
