import Link from "next/link";
import {
  BellRing,
  Building2,
  CalendarClock,
  CircleCheck,
  History,
} from "lucide-react";
import { HeroScene } from "@/components/illustrations/hero-scene";
import { HouseIllustration } from "@/components/illustrations/house";
import { localityLine, propertyTitle } from "@/components/property-address";
import { StatusBadge } from "@/components/status-badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatShortDate, parseCalendarDate } from "@/lib/calendar-date";
import type { DashboardRow } from "@/server/compliance/queries";

const ATTENTION = new Set(["overdue", "due", "due_soon"]);

function dueDate(row: DashboardRow) {
  return formatShortDate(parseCalendarDate(row.item.nextDueOn!)!);
}

// Blue banner with the page heading on the left and the decorative scene on the right.
export function DashboardHero({
  heading,
  children,
}: {
  heading: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-brand-soft px-6 py-7 sm:px-8 sm:py-9">
      <div className="relative z-10 max-w-xl">{heading}</div>
      {children && <div className="relative z-10 mt-5">{children}</div>}
      <HeroScene className="pointer-events-none absolute top-1/2 right-0 hidden h-[115%] -translate-y-1/2 md:block" />
    </div>
  );
}

// The soonest check that needs attention, or the next one due when nothing does.
export function NextDueCard({ rows }: { rows: DashboardRow[] }) {
  const row =
    rows.find((candidate) => ATTENTION.has(candidate.item.status)) ?? rows[0];
  if (!row) return null;
  const overdue = row.item.status === "overdue";
  return (
    <Card
      title="Next due"
      titleId="next-due-heading"
      icon={<CalendarClock />}
      action={{ href: "#deadlines-heading", label: "View all" }}
    >
      <div
        className={`flex flex-col gap-4 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between ${overdue ? "bg-danger-soft" : ATTENTION.has(row.item.status) ? "bg-warning-soft" : "bg-success-soft"}`}
      >
        <div className="min-w-0">
          <StatusBadge status={row.item.status} label={row.item.label} />
          <p className="mt-2 text-lg font-bold">{row.item.requirement.name}</p>
          <p className="text-sm text-ink-muted">
            <Link
              href={`/properties/${row.propertyId}`}
              className="font-medium text-brand"
            >
              {propertyTitle(row.property)}
            </Link>
            , {localityLine(row.property)}
          </p>
        </div>
        <Link
          href={`/properties/${row.propertyId}/checks/${row.item.requirement.code}/complete`}
          className={`${buttonClasses("primary")} shrink-0`}
        >
          Mark completed
        </Link>
      </div>
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <CalendarClock
            aria-hidden="true"
            className="h-4 w-4 text-ink-muted"
          />
          <dt className="text-ink-muted">Due</dt>
          <dd className="font-medium tabular-nums">{dueDate(row)}</dd>
        </div>
      </dl>
    </Card>
  );
}

export type ActivityItem = {
  id: string;
  kind: "completed" | "reminder";
  title: string;
  property: { id: string; label: string };
  date: string; // YYYY-MM-DD
};

const REMINDER_LABEL = {
  DAYS_30: "30 days before the due date",
  DAYS_7: "7 days before the due date",
  DUE_DATE: "on the due date",
  OVERDUE_7: "7 days after the due date",
} as const;

export function reminderActivityTitle(
  type: keyof typeof REMINDER_LABEL,
  checkName: string,
) {
  return `Reminder sent ${REMINDER_LABEL[type]}: ${checkName.charAt(0).toLowerCase()}${checkName.slice(1)}`;
}

export function RecentActivityCard({ items }: { items: ActivityItem[] }) {
  return (
    <Card title="Recent activity" titleId="activity-heading" icon={<History />}>
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Checks you mark completed and reminders we email you will show here.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li
              key={`${item.kind}-${item.id}`}
              className="flex gap-3 py-3 first:pt-0 last:pb-0"
            >
              {item.kind === "completed" ? (
                <CircleCheck
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-success"
                />
              ) : (
                <BellRing
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-brand"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-ink-muted">
                  <Link
                    href={`/properties/${item.property.id}`}
                    className="text-brand"
                  >
                    {item.property.label}
                  </Link>
                </p>
              </div>
              <time
                dateTime={item.date}
                className="shrink-0 text-sm text-ink-muted"
              >
                {formatShortDate(parseCalendarDate(item.date)!)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// One line per property with its soonest dated check. Rows arrive sorted by due date.
export function PropertiesCard({
  rows,
  notSetUp,
  limit = 5,
}: {
  rows: DashboardRow[];
  notSetUp: DashboardRow[];
  limit?: number;
}) {
  const seen = new Map<string, { row: DashboardRow; dated: boolean }>();
  for (const row of rows)
    if (!seen.has(row.propertyId))
      seen.set(row.propertyId, { row, dated: true });
  for (const row of notSetUp)
    if (!seen.has(row.propertyId))
      seen.set(row.propertyId, { row, dated: false });
  const entries = [...seen.values()].slice(0, limit);
  return (
    <Card
      title="Your properties"
      titleId="properties-heading"
      icon={<Building2 />}
      action={{ href: "/properties", label: "View all" }}
    >
      <ul className="divide-y divide-line">
        {entries.map(({ row, dated }, index) => (
          <li
            key={row.propertyId}
            className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
          >
            <HouseIllustration
              tint={index}
              className="h-12 w-16 shrink-0 sm:h-14 sm:w-20"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  <Link
                    href={`/properties/${row.propertyId}`}
                    className="hover:underline"
                  >
                    {propertyTitle(row.property)}
                  </Link>
                </p>
                <p className="text-sm text-ink-muted">
                  {localityLine(row.property)}
                </p>
                {dated && (
                  <p className="text-sm text-ink-muted">
                    {row.item.requirement.name} due{" "}
                    <span className="tabular-nums">{dueDate(row)}</span>
                  </p>
                )}
              </div>
              <div className="shrink-0">
                <StatusBadge
                  status={row.item.status}
                  label={dated ? undefined : row.item.label}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
