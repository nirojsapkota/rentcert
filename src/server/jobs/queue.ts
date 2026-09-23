import "server-only";
import { PgBoss } from "pg-boss";
import { runJob } from "./handlers";
import { RETRY_OPTIONS, type JobName } from "./names";

// QUEUE_DRIVER=pgboss (default): jobs go to PostgreSQL and the worker process runs them.
// QUEUE_DRIVER=inline (tests): jobs run immediately in this process; failures are logged.

let sender: Promise<PgBoss> | undefined;

// A send-only pg-boss client for the web process: no maintenance or scheduling here.
function getSender() {
  sender ??= new PgBoss({ connectionString: process.env.DATABASE_URL, supervise: false, schedule: false }).start();
  return sender;
}

export async function enqueue(name: JobName, data: Record<string, string>): Promise<void> {
  if ((process.env.QUEUE_DRIVER ?? "pgboss") === "inline") {
    try {
      await runJob(name, data, enqueue);
    } catch (error) {
      console.error(`[jobs] inline job ${name} failed`, error instanceof Error ? error.name : "unknown");
    }
    return;
  }
  await (await getSender()).send(name, data, RETRY_OPTIONS);
}
