import "server-only";
import type { ReminderType } from "@/generated/prisma/client";
import { addDays } from "@/lib/calendar-date";

// Pure reminder rules. The only place that decides which reminder is due for a record.

export const REMINDER_OFFSETS: { type: ReminderType; days: number }[] = [
  { type: "DAYS_30", days: -30 },
  { type: "DAYS_7", days: -7 },
  { type: "DUE_DATE", days: 0 },
  { type: "OVERDUE_7", days: 7 },
];

export const SEND_FROM_LOCAL_HOUR = 8;

export function localHour(now: Date, timezone: string): number {
  return Number(new Intl.DateTimeFormat("en-AU", { timeZone: timezone, hour: "numeric", hourCycle: "h23" }).format(now));
}

// Returns the reminder to send now, or null.
// - Nothing before 08:00 local time.
// - Only types scheduled after the day the record was created (no reminders for the past).
// - Of the types already due, only the latest (no catch-up spam).
export function dueReminder(input: {
  nextDueOn: string;
  recordCreatedOn: string;
  today: string;
  localHour: number;
}): { type: ReminderType; scheduledFor: string } | null {
  if (input.localHour < SEND_FROM_LOCAL_HOUR) return null;
  const due = REMINDER_OFFSETS.map(({ type, days }) => ({ type, scheduledFor: addDays(input.nextDueOn, days) })).filter(
    (reminder) => reminder.scheduledFor <= input.today && reminder.scheduledFor > input.recordCreatedOn,
  );
  return due.at(-1) ?? null;
}
