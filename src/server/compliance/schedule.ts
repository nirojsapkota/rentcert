import "server-only";
import { toCalendarDateString } from "@/lib/calendar-date";
import { complianceStatus, daysRemaining, statusLabel, type ScheduleStatus } from "@/server/compliance/status";

// Pure assembly of a property's schedule from already-loaded rows. No database access here.

export type RequirementInfo = {
  id: string;
  code: string;
  jurisdiction: string;
  name: string;
  description: string;
  recurrenceMonths: number;
  sourceName: string | null;
  sourceUrl: string | null;
  lastVerifiedAt: Date | null;
};

export type RecordSummary = {
  id: string;
  code: string;
  kind: "COMPLETED" | "UNKNOWN_LAST_CHECK";
  completedOn: Date | null;
  nextDueOn: Date;
  createdAt: Date;
};

export type ScheduleItem = {
  requirement: RequirementInfo;
  status: ScheduleStatus;
  label: string;
  nextDueOn: string | null;
  lastCompletedOn: string | null;
  daysRemaining: number | null;
  currentRecordKind: RecordSummary["kind"] | null;
};

// The current record per code: latest nextDueOn, then latest createdAt. A backfilled older
// check never replaces a newer one.
export function currentRecordsByCode(records: RecordSummary[]): Map<string, RecordSummary> {
  const current = new Map<string, RecordSummary>();
  for (const record of records) {
    const existing = current.get(record.code);
    if (
      !existing ||
      record.nextDueOn > existing.nextDueOn ||
      (record.nextDueOn.getTime() === existing.nextDueOn.getTime() && record.createdAt > existing.createdAt)
    ) {
      current.set(record.code, record);
    }
  }
  return current;
}

export function lastCompletedByCode(records: RecordSummary[]): Map<string, string> {
  const latest = new Map<string, string>();
  for (const record of records) {
    if (record.kind !== "COMPLETED" || !record.completedOn) continue;
    const date = toCalendarDateString(record.completedOn);
    const existing = latest.get(record.code);
    if (!existing || date > existing) latest.set(record.code, date);
  }
  return latest;
}

export function buildSchedule(
  requirements: RequirementInfo[],
  excludedCodes: Set<string>,
  records: RecordSummary[],
  today: string,
): ScheduleItem[] {
  const current = currentRecordsByCode(records);
  const lastCompleted = lastCompletedByCode(records);

  return requirements.map((requirement) => {
    const record = current.get(requirement.code);
    const base = { requirement, lastCompletedOn: lastCompleted.get(requirement.code) ?? null };

    if (excludedCodes.has(requirement.code)) {
      return { ...base, status: "not_applicable", label: "Not applicable", nextDueOn: null, daysRemaining: null, currentRecordKind: null };
    }
    if (!record) {
      return { ...base, status: "not_set_up", label: "Not set up", nextDueOn: null, daysRemaining: null, currentRecordKind: null };
    }
    const nextDueOn = toCalendarDateString(record.nextDueOn);
    return {
      ...base,
      status: complianceStatus(nextDueOn, today),
      label: statusLabel(nextDueOn, today),
      nextDueOn,
      daysRemaining: daysRemaining(nextDueOn, today),
      currentRecordKind: record.kind,
    };
  });
}
