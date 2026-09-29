import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { buttonClasses } from "@/components/ui/button";
import { formatCalendarDate, parseCalendarDate } from "@/lib/calendar-date";
import { basisLine } from "@/lib/requirement-basis";
import type { ScheduleItem } from "@/server/compliance/schedule";
import { setApplicableAction } from "./compliance-actions";

function formatDate(value: string | null): string {
  return value ? formatCalendarDate(parseCalendarDate(value)!) : "—";
}

function daysText(item: ScheduleItem): string {
  if (item.daysRemaining === null) return "—";
  if (item.daysRemaining < 0) return `${-item.daysRemaining} overdue`;
  return String(item.daysRemaining);
}

export function ComplianceSection({
  propertyId,
  state,
  isGeneric,
  items,
  archived,
}: {
  propertyId: string;
  state: string;
  isGeneric: boolean;
  items: ScheduleItem[];
  archived: boolean;
}) {
  const needsSetup = items.some((item) => item.status === "not_set_up");

  return (
    <section aria-labelledby="compliance-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="compliance-heading" className="text-xl font-bold">
          Compliance
        </h2>
        {needsSetup && !archived && (
          <Link href={`/properties/${propertyId}/setup`} className={buttonClasses("primary")}>
            Set up compliance dates
          </Link>
        )}
      </div>
      <p className="text-sm text-ink-muted">
        RentCert uses the dates you provide to calculate reminders. Confirm the applicable compliance date with your
        licensed provider or the official guidance for your state or territory.
      </p>
      {isGeneric && (
        <p className="rounded-md border border-brand/20 bg-brand-soft px-4 py-3 text-sm">
          General reminder schedule. RentCert has not yet researched {state} rules. Confirm what applies to your property.
        </p>
      )}

      <ul className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <li key={item.requirement.code} className="flex flex-col rounded-lg border border-line bg-surface p-5">
            <h3 className="text-lg font-bold">{item.requirement.name}</h3>
            <p className="mt-1 text-sm text-ink-muted">
              {basisLine(item.requirement.basis, item.requirement.jurisdiction, item.requirement.recurrenceMonths)}
            </p>
            <div className="mt-3">
              <StatusBadge status={item.status} label={item.label} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <dt className="text-ink-muted">Last completed</dt>
              <dd>{item.currentRecordKind === "UNKNOWN_LAST_CHECK" && !item.lastCompletedOn ? "Unknown" : formatDate(item.lastCompletedOn)}</dd>
              <dt className="text-ink-muted">Next due</dt>
              <dd>{formatDate(item.nextDueOn)}</dd>
              <dt className="text-ink-muted">Days remaining</dt>
              <dd>{daysText(item)}</dd>
            </dl>
            {!isGeneric && (
              <p className="mt-3 text-xs text-ink-muted">
                {item.requirement.sourceUrl && (
                  <>
                    Source:{" "}
                    <a href={item.requirement.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                      {item.requirement.sourceName}
                    </a>
                    .{" "}
                  </>
                )}
                {item.requirement.lastVerifiedAt ? `Checked ${item.requirement.lastVerifiedAt.toLocaleDateString("en-AU")}.` : "Not yet verified."}
              </p>
            )}
            <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
              {item.status !== "not_applicable" && item.status !== "not_set_up" && !archived && (
                <Link
                  href={`/properties/${propertyId}/checks/${item.requirement.code}/complete`}
                  className={buttonClasses("secondary")}
                  aria-label={`Mark ${item.requirement.name.toLowerCase()} completed`}
                >
                  Mark completed
                </Link>
              )}
              {item.status === "not_applicable" ? (
                <form action={setApplicableAction.bind(null, propertyId, item.requirement.code, true)}>
                  <button type="submit" className="text-sm font-medium text-brand hover:underline">
                    This check applies
                  </button>
                </form>
              ) : (
                <form action={setApplicableAction.bind(null, propertyId, item.requirement.code, false)}>
                  <button
                    type="submit"
                    className="text-sm font-medium text-ink-muted underline decoration-line underline-offset-4 hover:text-ink"
                    aria-label={`Mark ${item.requirement.name.toLowerCase()} not applicable`}
                  >
                    Not applicable
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
