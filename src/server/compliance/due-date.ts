import "server-only";
import { addMonths } from "@/lib/calendar-date";

// The only place that turns a completion date into a next due date. Month arithmetic, never 365 days.
export function nextDueOn(completedOn: string, recurrenceMonths: number): string {
  if (!Number.isInteger(recurrenceMonths) || recurrenceMonths <= 0) {
    throw new Error(`recurrenceMonths must be a positive integer, got ${recurrenceMonths}`);
  }
  return addMonths(completedOn, recurrenceMonths);
}
