import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { addressLookupEnabled } from "@/server/address/search";
import { getPool, listActiveClientOptions } from "@/server/barrier/queries";
import { listCouncilOptions } from "@/server/councils/queries";
import { requireInspector } from "@/server/session";
import { updatePoolAction } from "../../actions";
import { PoolForm } from "../../pool-form";

export const metadata: Metadata = { title: "Edit pool or spa" };

export default async function EditPoolPage({ params }: PageProps<"/pools/[id]/edit">) {
  const { id } = await params;
  const user = await requireInspector();
  const [pool, activeClients, councils] = await Promise.all([getPool(user.id, id), listActiveClientOptions(user.id), listCouncilOptions()]);
  if (!pool) notFound();
  // Keep the current client selectable even when archived.
  const clients = activeClients.some((client) => client.id === pool.client.id) ? activeClients : [...activeClients, { id: pool.client.id, name: pool.client.name }];

  return (
    <section className="max-w-2xl">
      <h1 className="text-3xl font-bold text-deep">Edit pool or spa</h1>
      <div className="mt-6 rounded-lg border border-line bg-surface p-6">
        <PoolForm
          action={updatePoolAction.bind(null, pool.id)}
          initialValues={{
            clientId: pool.clientId,
            kind: pool.kind,
            addressLine1: pool.addressLine1,
            addressLine2: pool.addressLine2 ?? "",
            suburb: pool.suburb,
            postcode: pool.postcode,
            councilId: pool.councilId ?? "",
            notes: pool.notes ?? "",
          }}
          clients={clients}
          councils={councils}
          submitLabel="Save changes"
          cancelHref={"/pools/" + pool.id}
          addressLookup={addressLookupEnabled()}
        />
      </div>
    </section>
  );
}
