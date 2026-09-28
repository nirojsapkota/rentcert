import type { Metadata } from "next";
import Link from "next/link";
import { localityLine, propertyTitle } from "@/components/property-address";
import { StatusBadge } from "@/components/status-badge";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { formatCalendarDate, parseCalendarDate, todayIn } from "@/lib/calendar-date";
import { greetingFor } from "@/lib/greeting";
import {
  filterDashboardRows,
  getDashboard,
  listRecentCompletions,
  type DashboardFilter,
} from "@/server/compliance/queries";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Dashboard" };

const FILTERS: { value: DashboardFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "due_soon", label: "Due soon" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
];

function parseFilter(value: unknown): DashboardFilter {
  return FILTERS.some((filter) => filter.value === value) ? (value as DashboardFilter) : "all";
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser();
  const query = await searchParams;
  const filter = parseFilter(query.filter);
  const timezone = user.timezone ?? "Australia/Melbourne";
  const today = todayIn(timezone);
  const dashboard = await getDashboard(user.id, today);
  const completions = filter === "completed" ? await listRecentCompletions(user.id, today) : [];

  const heading = (
    <div>
      <h1 className="text-3xl font-bold text-deep sm:text-4xl">
        {greetingFor(new Date(), timezone)}, {user.firstName}
      </h1>
      <p className="mt-1 text-ink-muted">Your compliance overview</p>
      {query.shared === "1" && (
        <div className="mt-4">
          <Alert tone="success">Invite accepted. Properties shared with you now appear here.</Alert>
        </div>
      )}
    </div>
  );

  if (dashboard.propertyCount === 0) {
    return (
      <section className="space-y-6">
        {heading}
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <h2 className="text-xl font-bold">Add your first property</h2>
          <p className="mt-1 text-ink-muted">Start tracking your compliance deadlines and certificates.</p>
          <Link href="/properties/new" className={`${buttonClasses("primary")} mt-4`}>
            Add property
          </Link>
        </div>
      </section>
    );
  }

  const rows = filter === "completed" ? [] : filterDashboardRows(dashboard.rows, filter);
  const stats = [
    { label: dashboard.propertyCount === 1 ? "Property" : "Properties", value: dashboard.propertyCount, href: "/properties", tone: "border-line bg-surface text-deep" },
    { label: "Overdue", value: dashboard.counts.overdue, href: "/dashboard?filter=overdue", tone: "border-danger/20 bg-danger-soft text-danger" },
    { label: "Due soon", value: dashboard.counts.dueSoon, href: "/dashboard?filter=due_soon", tone: "border-warning/20 bg-warning-soft text-warning" },
    { label: "Up to date", value: dashboard.counts.upToDate, href: "/dashboard?filter=upcoming", tone: "border-success/20 bg-success-soft text-success" },
  ];

  return (
    <section className="space-y-8">
      {heading}

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((stat) => (
          <li key={stat.label}>
            <Link href={stat.href} className={`block rounded-lg border p-4 transition hover:-translate-y-0.5 hover:shadow-sm sm:p-5 ${stat.tone}`}>
              <span className="block font-display text-4xl font-bold">{stat.value}</span>
              <span className="text-sm font-semibold">{stat.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      {dashboard.notSetUp.length > 0 && (
        <p className="rounded-md border border-brand/20 bg-brand-soft px-4 py-3 text-sm">
          {dashboard.notSetUp.length} {dashboard.notSetUp.length === 1 ? "check needs" : "checks need"} a starting date.{" "}
          <Link href={`/properties/${dashboard.notSetUp[0].propertyId}/setup`} className="font-medium text-brand hover:underline">
            Set up compliance dates
          </Link>
        </p>
      )}

      <section aria-labelledby="deadlines-heading" className="space-y-3">
        <h2 id="deadlines-heading" className="text-xl font-bold">
          {filter === "completed" ? "Completed checks (last 12 months)" : "Upcoming deadlines"}
        </h2>
        <nav aria-label="Deadline filters" className="flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <Link
              key={option.value}
              href={option.value === "all" ? "/dashboard" : `/dashboard?filter=${option.value}`}
              aria-current={filter === option.value ? "page" : undefined}
              className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-semibold text-ink-muted hover:text-ink aria-[current=page]:border-deep aria-[current=page]:bg-deep aria-[current=page]:text-white"
            >
              {option.label}
            </Link>
          ))}
        </nav>

        {filter === "completed" ? (
          completions.length === 0 ? (
            <p className="text-ink-muted">No checks completed in the last 12 months.</p>
          ) : (
            <div className="relative overflow-x-auto rounded-lg border border-line bg-surface">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="border-b border-line bg-canvas text-ink-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">Property</th>
                    <th scope="col" className="px-4 py-2 font-medium">Requirement</th>
                    <th scope="col" className="px-4 py-2 font-medium">Completed</th>
                    <th scope="col" className="px-4 py-2 font-medium">Next due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {completions.map((record) => (
                    <tr key={record.id}>
                      <td className="px-4 py-2">
                        <Link href={`/properties/${record.property.id}`} className="font-medium text-brand hover:underline">
                          {propertyTitle(record.property)}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{record.requirement.name}</td>
                      <td className="px-4 py-2">{record.completedOn ? formatCalendarDate(record.completedOn) : "—"}</td>
                      <td className="px-4 py-2">{formatCalendarDate(record.nextDueOn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : rows.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface p-8 text-center text-ink-muted">You&apos;re all caught up.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={`${row.propertyId}-${row.item.requirement.code}`}
                className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{row.item.requirement.name}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    <Link href={`/properties/${row.propertyId}`} className="font-semibold text-brand hover:underline">
                      {propertyTitle(row.property)}
                    </Link>
                    , {localityLine(row.property)}
                    {row.property.userId !== user.id && <> · Shared by {row.property.user.firstName}</>}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <span className="text-sm text-ink-muted">Due {formatCalendarDate(parseCalendarDate(row.item.nextDueOn!)!)}</span>
                  <StatusBadge status={row.item.status} label={row.item.label} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
