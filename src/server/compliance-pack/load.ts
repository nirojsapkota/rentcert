import "server-only";
import { localityLine, streetLine } from "@/components/property-address";
import { formatCalendarDate, parseCalendarDate, todayIn } from "@/lib/calendar-date";
import { formatBytes } from "@/lib/format";
import { track } from "@/server/analytics/track";
import { recordAuditEvent } from "@/server/audit";
import { getPropertySchedule, listAllPropertyHistory } from "@/server/compliance/queries";
import { listDocumentsForProperty } from "@/server/vault/queries";

// Plain data for the PDF. Everything is already formatted, so the generator does no date or
// status logic of its own.
export type PackData = {
  generatedOn: string; // "23 September 2026"
  generatedOnIso: string; // "2026-09-23", for the filename
  property: {
    id: string;
    street: string;
    locality: string;
    state: string;
    nickname: string | null;
    leaseStart: string | null;
    archived: boolean;
  };
  isGeneric: boolean;
  summary: { name: string; status: string; lastCompleted: string; nextDue: string; source: string | null }[];
  history: { requirement: string; completed: string; nextDue: string; provider: string; licence: string }[];
  documents: { filename: string; requirement: string; recordCompleted: string; uploaded: string; size: string; fingerprint: string }[];
};

const dash = "—";

export async function loadCompliancePack(userId: string, propertyId: string, timezone: string, now: Date = new Date()): Promise<PackData | null> {
  const today = todayIn(timezone, now);
  const [schedule, history, documents] = await Promise.all([
    getPropertySchedule(userId, propertyId, today),
    listAllPropertyHistory(userId, propertyId),
    listDocumentsForProperty(userId, propertyId),
  ]);
  if (!schedule || !history) return null;
  const { property } = schedule;

  return {
    generatedOn: formatCalendarDate(parseCalendarDate(today)!),
    generatedOnIso: today,
    property: {
      id: property.id,
      street: streetLine(property),
      locality: localityLine(property),
      state: property.state,
      nickname: property.nickname,
      leaseStart: property.leaseStartDate ? formatCalendarDate(property.leaseStartDate) : null,
      archived: property.archivedAt !== null,
    },
    isGeneric: schedule.isGeneric,
    summary: schedule.items.map((item) => ({
      name: item.requirement.name,
      status: item.label,
      lastCompleted: item.lastCompletedOn
        ? formatCalendarDate(parseCalendarDate(item.lastCompletedOn)!)
        : item.currentRecordKind === "UNKNOWN_LAST_CHECK"
          ? "Unknown"
          : dash,
      nextDue: item.nextDueOn ? formatCalendarDate(parseCalendarDate(item.nextDueOn)!) : dash,
      source:
        !schedule.isGeneric && item.requirement.sourceName
          ? `${item.requirement.sourceName}${item.requirement.lastVerifiedAt ? "" : " (interval not yet verified)"}`
          : null,
    })),
    history: history.map((record) => ({
      requirement: record.requirement.name,
      completed: record.completedOn ? formatCalendarDate(record.completedOn) : "Last check unknown",
      nextDue: formatCalendarDate(record.nextDueOn),
      provider: record.providerName ?? dash,
      licence: record.providerLicenceNumber ?? dash,
    })),
    documents: documents.map((document) => ({
      filename: document.filename,
      requirement: document.complianceRecord.requirement.name,
      recordCompleted: document.complianceRecord.completedOn ? formatCalendarDate(document.complianceRecord.completedOn) : dash,
      uploaded: new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: timezone }).format(document.uploadedAt),
      size: formatBytes(document.byteSize),
      fingerprint: document.sha256.slice(0, 16),
    })),
  };
}

export async function recordPackGenerated(userId: string, propertyId: string) {
  await recordAuditEvent({
    userId,
    resourceType: "property",
    resourceId: propertyId,
    action: "compliance_pack.generated",
    metadata: { propertyId },
  });
  await track("compliance_pack_downloaded", userId);
}
