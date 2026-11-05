import { addMonths } from "@/lib/calendar-date";

export const RECALL_INTERVAL_MONTHS = 48;

// The only place that works out when a pool is next due. Only a pass starts a new 4-year period.
export function nextRecallDate(outcome: "PASS" | "FAIL" | "PENDING", inspectedOn: string): string | null {
  return outcome === "PASS" ? addMonths(inspectedOn, RECALL_INTERVAL_MONTHS) : null;
}
