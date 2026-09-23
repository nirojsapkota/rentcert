import "server-only";
import { addDays, todayIn } from "@/lib/calendar-date";
import { listReminderCandidates } from "@/server/compliance/queries";
import { db } from "@/server/db";
import { dueReminder, localHour } from "@/server/reminders/schedule";

// Finds reminders that are due now and claims each one by inserting its row. The unique
// (record, type) constraint makes the claim idempotent: a second or parallel scan inserts
// nothing for the same reminder. Returns the ids of newly claimed reminders.
export async function scanDueReminders(now: Date = new Date()): Promise<string[]> {
  // Every Australian timezone is within a day of UTC, so this horizon covers all users.
  const horizon = addDays(todayIn("UTC", now), 31);
  const candidates = await listReminderCandidates({
    nextDueOnOrBefore: new Date(`${horizon}T00:00:00Z`),
    skipFinished: true,
    now,
  });

  const claimed: string[] = [];
  for (const candidate of candidates) {
    const due = dueReminder({
      nextDueOn: candidate.nextDueOn,
      recordCreatedOn: todayIn(candidate.timezone, candidate.recordCreatedAt),
      today: todayIn(candidate.timezone, now),
      localHour: localHour(now, candidate.timezone),
    });
    if (!due) continue;

    const rows = await db.$queryRaw<{ id: string }[]>`
      INSERT INTO compliance_reminders (id, compliance_record_id, reminder_type, scheduled_for, status, attempts, created_at, updated_at)
      VALUES (gen_random_uuid(), ${candidate.recordId}::uuid, ${due.type}::"ReminderType", ${due.scheduledFor}::date, 'PENDING', 0, now(), now())
      ON CONFLICT (compliance_record_id, reminder_type) DO NOTHING
      RETURNING id`;
    claimed.push(...rows.map((row) => row.id));
  }
  return claimed;
}
