import type { Metadata } from "next";
import Link from "next/link";
import { localityLine, propertyTitle } from "@/components/property-address";
import { StatusBadge } from "@/components/status-badge";
import { SummaryStats } from "@/components/summary-stats";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { formatShortDate, parseCalendarDate, todayIn } from "@/lib/calendar-date";
import { greetingFor } from "@/lib/greeting";
import {
  filterDashboardRows,
  getDashboard,
  listRecentCompletions,
  type DashboardFilter,
} from "@/server/compliance/queries";
import { countRecallsDue } from "@/server/barrier/inspections";
import { countActiveBarrierRecords } from "@/server/barrier/queries";
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

async function InspectorDashboard({ firstName, timezone, userId }: { firstName: string; timezone: string; userId: string }) {
  const { clients, pools } = await countActiveBarrierRecords(userId);
  const recalls = await countRecallsDue(userId, todayIn(timezone), 90);
  const stats = [
    { label: clients === 1 ? "Client" : "Clients", value: clients, href: "/clients" },
    { label: pools === 1 ? "Pool or spa" : "Pools and spas", value: pools, href: "/pools" },
    { label: recalls === 1 ? "Recall due in 90 days" : "Recalls due in 90 days", value: recalls, href: "/pools", tone: "warning" as const },
  ];
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">Pool register</h1>
        <p className="mt-1 text-ink-muted">
          {greetingFor(new Date(), timezone)}, {firstName}
        </p>
      </div>
      <SummaryStats label="Register summary" stats={stats} />
      {clients === 0 && (
        <div className="border border-line bg-surface p-6">
          <h2 className="text-xl font-bold">Add your first client</h2>
          <p className="mt-1 text-ink-muted">Then add the pools and spas you inspect for them.</p>
          <Link href="/clients/new" className={`${buttonClasses("primary")} mt-4`}>
            Add client
          </Link>
        </div>
      )}
    </section>
  );
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser();
  if (user.accountType === "INSPECTOR") return <InspectorDashboard firstName={user.firstName} timezone={user.timezone ?? "Australia/Melbourne"} userId={user.id} />;
  const query = await searchParams;
  const filter = parseFilter(query.filter);
  const timezone = user.timezone ?? "Australia/Melbourne";
  const today = todayIn(timezone);
  const dashboard = await getDashboard(user.id, today);
  const completions = filter === "completed" ? await listRecentCompletions(user.id, today) : [];

  const heading = (
    <div>
      <h1 className="text-3xl font-bold sm:text-4xl">Due checks</h1>
      <p className="mt-1 text-ink-muted">
        {greetingFor(new Date(), timezone)}, {user.firstName}. Dates are based on the ones you entered.
      </p>
      {query.shared === "1" && (
        <div className="mt-4">
          <Alert tone="success">
            Invite accepted. You&apos;re signed in as {user.email}. Properties shared with you now appear here, marked
            &ldquo;Shared by&rdquo;.
          </Alert>
        </div>
      )}
    </div>
  );

  if (dashboard.propertyCount === 0) {
    return (
      <section className="space-y-6">
        {heading}
        <div className="border border-line bg-surface p-6">
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
    { label: "Overdue", value: dashboard.counts.overdue, href: "/dashboard?filter=overdue", tone: "danger" as const },
    { label: "Due soon", value: dashboard.counts.dueSoon, href: "/dashboard?filter=due_soon", tone: "warning" as const },
    { label: "Up to date", value: dashboard.counts.upToDate, href: "/dashboard?filter=upcoming", tone: "success" as const },
    { label: dashboard.propertyCount === 1 ? "Property" : "Properties", value: dashboard.propertyCount, href: "/properties" },
  ];

  return (
    <section className="space-y-6">
      {heading}

      <SummaryStats label="Compliance summary" stats={stats} />

      {dashboard.notSetUp.length > 0 && (
        <Alert tone="info">
          {dashboard.notSetUp.length} {dashboard.notSetUp.length === 1 ? "check needs" : "checks need"} a starting date.{" "}
          <Link href={`/properties/${dashboard.notSetUp[0].propertyId}/setup`} className="font-medium text-brand hover:underline">
            Set up compliance dates
          </Link>
        </Alert>
      )}

      <section aria-labelledby="deadlines-heading" className="space-y-4">
        <h2 id="deadlines-heading" className="text-xl font-bold">
          {filter === "completed" ? "Completed checks (last 12 months)" : "Upcoming deadlines"}
        </h2>
        <nav aria-label="Deadline filters" className="flex flex-wrap gap-1.5">
          {FILTERS.map((option) => (
            <Link
              key={option.value}
              href={option.value === "all" ? "/dashboard" : `/dashboard?filter=${option.value}`}
              aria-current={filter === option.value ? "page" : undefined}
              className="rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-muted hover:text-ink aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
            >
              {option.label}
            </Link>
          ))}
        </nav>

        {filter === "completed" ? (
          completions.length === 0 ? (
            <p className="text-ink-muted">No checks completed in the last 12 months.</p>
          ) : (
            <div className="relative overflow-x-auto border-y border-line bg-surface">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="border-b border-line font-mono text-[0.6875rem] tracking-[0.07em] text-ink-muted uppercase">
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
                      <td className="px-4 py-2 font-mono whitespace-nowrap">{record.completedOn ? formatShortDate(record.completedOn) : "—"}</td>
                      <td className="px-4 py-2 font-mono whitespace-nowrap">{formatShortDate(record.nextDueOn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : rows.length === 0 ? (
          <p className="border-y border-line py-6 text-ink-muted">You&apos;re all caught up.</p>
        ) : (
          <div className="relative overflow-x-auto border-y border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line font-mono text-[0.6875rem] tracking-[0.07em] text-ink-muted uppercase">
                <tr>
                  <th scope="col" className="py-2 pr-3 pl-4 font-medium">Check</th>
                  <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">Due</th>
                  <th scope="col" className="py-2 pr-4 pl-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => {
                  const due = formatShortDate(parseCalendarDate(row.item.nextDueOn!)!);
                  return (
                    <tr key={`${row.propertyId}-${row.item.requirement.code}`} className="align-top hover:bg-canvas">
                      {/* Overdue rows carry a red leading rule, so state shows by shape as well as colour. */}
                      <td className={`py-2.5 pr-3 pl-4 ${row.item.status === "overdue" ? "shadow-[inset_3px_0_0_var(--color-danger)]" : ""}`}>
                        <p className="font-semibold">{row.item.requirement.name}</p>
                        <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
                          <Link href={`/properties/${row.propertyId}`} className="font-medium text-brand">
                            {propertyTitle(row.property)}
                          </Link>
                          , {localityLine(row.property)}
                          {row.property.userId !== user.id && <> · Shared by {row.property.user.firstName}</>}
                        </p>
                      </td>
                      <td className="hidden px-3 py-2.5 font-mono whitespace-nowrap sm:table-cell">{due}</td>
                      <td className="py-2.5 pr-4 pl-3 text-right sm:text-left">
                        <StatusBadge status={row.item.status} label={row.item.label} />
                        <span className="mt-1.5 block font-mono text-[0.8125rem] whitespace-nowrap text-ink-muted sm:hidden">Due {due}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
