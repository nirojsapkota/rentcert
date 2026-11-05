import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmForm } from "@/components/confirm-form";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { getClient } from "@/server/barrier/queries";
import { requireInspector } from "@/server/session";
import { archiveClientAction, restoreClientAction } from "../actions";

export const metadata: Metadata = { title: "Client" };

export default async function ClientPage({ params, searchParams }: PageProps<"/clients/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const user = await requireInspector();
  const client = await getClient(user.id, id);
  if (!client) notFound();
  const archived = client.archivedAt !== null;

  return (
    <section className="max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/clients" className="text-sm font-medium text-brand hover:underline">
            ← Clients
          </Link>
          <h1 className="mt-1 text-3xl font-bold text-deep">{client.name}</h1>
          {archived && <p className="text-sm font-medium text-warning">Archived</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={"/clients/" + client.id + "/edit"} className={buttonClasses("secondary")}>
            Edit
          </Link>
          {archived ? (
            <ConfirmForm action={restoreClientAction.bind(null, client.id)} question="Restore this client?" label="Restore" />
          ) : (
            <ConfirmForm
              action={archiveClientAction.bind(null, client.id)}
              question="Archive this client and their pools and spas? You can restore them later."
              label="Archive"
            />
          )}
        </div>
      </div>

      {query.created === "1" && <Alert tone="success">Client added.</Alert>}
      {query.saved === "1" && <Alert tone="success">Changes saved.</Alert>}

      <dl className="grid gap-3 border-y border-line py-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-ink-muted">Email</dt>
          <dd className="break-words">{client.email ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-muted">Phone</dt>
          <dd>{client.phone ?? "—"}</dd>
        </div>
        {client.notes && (
          <div className="sm:col-span-2">
            <dt className="text-sm text-ink-muted">Notes</dt>
            <dd className="whitespace-pre-wrap">{client.notes}</dd>
          </div>
        )}
      </dl>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Pools and spas</h2>
        {!archived && (
          <Link href={"/pools/new?clientId=" + client.id} className={buttonClasses("primary")}>
            Add pool or spa
          </Link>
        )}
      </div>
      {client.pools.length === 0 ? (
        <p className="text-ink-muted">No pools or spas yet.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line bg-surface">
          {client.pools.map((pool) => (
            <li key={pool.id}>
              <Link href={"/pools/" + pool.id} className="block px-4 py-3 hover:bg-canvas">
                <span className="block font-semibold">
                  {pool.addressLine1}
                  {pool.archivedAt && <span className="ml-2 text-sm font-medium text-warning">Archived</span>}
                </span>
                <span className="block text-sm text-ink-muted">
                  {pool.kind === "SPA" ? "Spa" : "Pool"} · {pool.suburb} VIC {pool.postcode}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
