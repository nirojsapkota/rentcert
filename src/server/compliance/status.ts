import "server-only";
import { daysBetween } from "@/lib/calendar-date";

// The only place that decides a compliance status. Views, jobs and emails all call this.

export type DueStatus = "overdue" | "due" | "due_soon" | "upcoming";
export type ScheduleStatus = DueStatus | "not_applicable" | "not_set_up";

export const DEFAULT_DUE_SOON_DAYS = 30;

export function dueSoonDays(): number {
  const configured = Number.parseInt(process.env.COMPLIANCE_DUE_SOON_DAYS ?? "", 10);
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_DUE_SOON_DAYS;
}

// `nextDueOn` and `today` are YYYY-MM-DD; `today` must be the date in the user's timezone.
export function complianceStatus(nextDueOn: string, today: string, windowDays: number = dueSoonDays()): DueStatus {
  const daysRemaining = daysBetween(today, nextDueOn);
  if (daysRemaining < 0) return "overdue";
  if (daysRemaining === 0) return "due";
  if (daysRemaining <= windowDays) return "due_soon";
  return "upcoming";
}

export function statusLabel(nextDueOn: string, today: string): string {
  const daysRemaining = daysBetween(today, nextDueOn);
  if (daysRemaining < 0) return `Overdue by ${plural(-daysRemaining)}`;
  if (daysRemaining === 0) return "Due today";
  return `Due in ${plural(daysRemaining)}`;
}

export function daysRemaining(nextDueOn: string, today: string): number {
  return daysBetween(today, nextDueOn);
}

function plural(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}
