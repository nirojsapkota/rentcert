import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { isUuid } from "@/lib/ids";
import { addressLookupEnabled } from "@/server/address/search";
import { listActiveClientOptions } from "@/server/barrier/queries";
import { listCouncilOptions } from "@/server/councils/queries";
import { requireInspector } from "@/server/session";
import { createPoolAction } from "../actions";
import { PoolForm } from "../pool-form";

export const metadata: Metadata = { title: "Add pool or spa" };

export default async function NewPoolPage({ searchParams }: PageProps<"/pools/new">) {
  const query = await searchParams;
  const user = await requireInspector();
  const [clients, councils] = await Promise.all([listActiveClientOptions(user.id), listCouncilOptions()]);
  const preselected = typeof query.clientId === "string" && isUuid(query.clientId) ? query.clientId : "";

  return (
    <section className="max-w-2xl">
      <h1 className="text-3xl font-bold text-deep">Add pool or spa</h1>
      <div className="mt-6 rounded-lg border border-line bg-surface p-6">
        {clients.length === 0 ? (
          <div className="space-y-3">
            <Alert tone="info">Add a client first, then add their pool or spa.</Alert>
            <Link href="/clients/new" className={buttonClasses("primary")}>
              Add client
            </Link>
          </div>
        ) : (
          <PoolForm
            action={createPoolAction}
            initialValues={{ clientId: preselected }}
            clients={clients}
            councils={councils}
            submitLabel="Add pool or spa"
            cancelHref="/pools"
            addressLookup={addressLookupEnabled()}
          />
        )}
      </div>
    </section>
  );
}
