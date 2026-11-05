import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmForm } from "@/components/confirm-form";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { formatCalendarDate } from "@/lib/calendar-date";
import { INSPECTION_KINDS, INSPECTION_OUTCOMES } from "@/lib/inspection-validation";
import { listInspectionsForPool } from "@/server/barrier/inspections";
import { getPool } from "@/server/barrier/queries";
import { requireInspector } from "@/server/session";
import { archivePoolAction, restorePoolAction } from "../actions";

export const metadata: Metadata = { title: "Pool or spa" };

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

      <dl className="grid gap-3 rounded-lg border border-line bg-surface p-5">
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

      <div className="space-y-4 rounded-lg border border-line bg-surface p-5">
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
          <ul className="divide-y divide-line">
            {inspections.map((inspection) => (
              <li key={inspection.id} className="py-2">
                <Link href={"/pools/" + pool.id + "/inspections/" + inspection.id} className="font-medium text-brand hover:underline">
                  {formatCalendarDate(inspection.inspectedOn)}
                </Link>
                <span className="text-ink-muted">
                  {" · "}
                  {INSPECTION_KINDS.find((k) => k.code === inspection.kind)?.name} · {INSPECTION_OUTCOMES.find((o) => o.code === inspection.outcome)?.name}
                  {inspection._count.photos > 0 && " · " + inspection._count.photos + (inspection._count.photos === 1 ? " photo" : " photos")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
