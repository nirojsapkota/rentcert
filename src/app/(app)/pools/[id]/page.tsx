import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmForm } from "@/components/confirm-form";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { formatCalendarDate, formatShortDate } from "@/lib/calendar-date";
import { INSPECTION_KINDS, INSPECTION_OUTCOMES } from "@/lib/inspection-validation";
import { listInspectionsForPool } from "@/server/barrier/inspections";
import { getPool } from "@/server/barrier/queries";
import { requireInspector } from "@/server/session";
import { archivePoolAction, restorePoolAction } from "../actions";

export const metadata: Metadata = { title: "Pool or spa" };

// Inspection outcome as a service-tag stamp, matching the compliance status stamps.
const OUTCOME_STAMP: Record<string, string> = {
  PASS: "border-success text-success",
  FAIL: "border-danger text-danger",
  PENDING: "border-[#d9b21a] bg-tag-soft text-tag-ink",
};

export default async function PoolPage({ params, searchParams }: PageProps<"/pools/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const user = await requireInspector();
  const pool = await getPool(user.id, id);
  if (!pool) notFound();
  const archived = pool.archivedAt !== null;
  const inspections = await listInspectionsForPool(user.id, pool.id);
  const current = inspections.find((inspection) => inspection.outcome === "PASS");

  return (
    <section className="max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/pools" className="text-sm font-medium text-brand hover:underline">
            ← Pools and spas
          </Link>
          <h1 className="mt-1 text-3xl font-bold text-deep">{pool.addressLine2 ? pool.addressLine1 + ", " + pool.addressLine2 : pool.addressLine1}</h1>
          <p className="text-ink-muted">
            {pool.kind === "SPA" ? "Spa" : "Pool"} · {pool.suburb} VIC {pool.postcode}
          </p>
          {archived && <p className="text-sm font-medium text-warning">Archived</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={"/pools/" + pool.id + "/edit"} className={buttonClasses("secondary")}>
            Edit
          </Link>
          {archived ? (
            <ConfirmForm action={restorePoolAction.bind(null, pool.id)} question="Restore this pool or spa?" label="Restore" />
          ) : (
            <ConfirmForm action={archivePoolAction.bind(null, pool.id)} question="Archive this pool or spa? You can restore it later." label="Archive" />
          )}
        </div>
      </div>

      {query.created === "1" && <Alert tone="success">Pool or spa added.</Alert>}
      {query.saved === "1" && <Alert tone="success">Changes saved.</Alert>}
      {query.restore === "client_archived" && <Alert tone="error">Restore the client first, then restore this pool or spa.</Alert>}

      <dl className="grid gap-3 border-y border-line py-4">
        <div>
          <dt className="text-sm text-ink-muted">Client</dt>
          <dd>
            <Link href={"/clients/" + pool.client.id} className="font-medium text-brand hover:underline">
              {pool.client.name}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-muted">Council</dt>
          <dd>{pool.council?.name ?? "Not set"}</dd>
        </div>
        {pool.notes && (
          <div>
            <dt className="text-sm text-ink-muted">Notes</dt>
            <dd className="whitespace-pre-wrap">{pool.notes}</dd>
          </div>
        )}
      </dl>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">Inspections</h2>
          {!archived && (
            <Link href={"/pools/" + pool.id + "/inspections/new"} className={buttonClasses("primary")}>
              Log inspection
            </Link>
          )}
        </div>
        <p className="text-sm text-ink-muted">
          {current?.nextRecallOn
            ? "Next recall based on the dates you entered: " + formatCalendarDate(current.nextRecallOn)
            : "No recall date yet. It is set when you record a pass."}
        </p>
        {inspections.length === 0 ? (
          <p className="text-ink-muted">No inspections logged yet.</p>
        ) : (
          <div className="relative overflow-x-auto border-y border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line font-mono text-[0.6875rem] tracking-[0.07em] text-ink-muted uppercase">
                <tr>
                  <th scope="col" className="py-2 pr-3 pl-4 font-medium">Date</th>
                  <th scope="col" className="px-3 py-2 font-medium">Type</th>
                  <th scope="col" className="px-3 py-2 font-medium">Outcome</th>
                  <th scope="col" className="hidden py-2 pr-4 pl-3 font-medium sm:table-cell">Photos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {inspections.map((inspection) => (
                  <tr key={inspection.id}>
                    <td className="py-2.5 pr-3 pl-4 whitespace-nowrap">
                      <Link href={"/pools/" + pool.id + "/inspections/" + inspection.id} className="font-mono font-medium text-brand">
                        {formatShortDate(inspection.inspectedOn)}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">{INSPECTION_KINDS.find((k) => k.code === inspection.kind)?.name}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block rounded-sm border px-2 py-1 font-mono text-xs leading-none font-semibold tracking-[0.04em] uppercase ${OUTCOME_STAMP[inspection.outcome]}`}>
                        {INSPECTION_OUTCOMES.find((o) => o.code === inspection.outcome)?.name}
                      </span>
                    </td>
                    <td className="hidden py-2.5 pr-4 pl-3 font-mono sm:table-cell">{inspection._count.photos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
