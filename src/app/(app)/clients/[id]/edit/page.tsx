import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClient } from "@/server/barrier/queries";
import { requireInspector } from "@/server/session";
import { updateClientAction } from "../../actions";
import { ClientForm } from "../../client-form";

export const metadata: Metadata = { title: "Edit client" };

export default async function EditClientPage({ params }: PageProps<"/clients/[id]/edit">) {
  const { id } = await params;
  const user = await requireInspector();
  const client = await getClient(user.id, id);
  if (!client) notFound();
  return (
    <section className="max-w-2xl">
      <h1 className="text-3xl font-bold text-deep">Edit {client.name}</h1>
      <div className="mt-6 rounded-lg border border-line bg-surface p-6">
        <ClientForm
          action={updateClientAction.bind(null, client.id)}
          initialValues={{ name: client.name, email: client.email ?? "", phone: client.phone ?? "", notes: client.notes ?? "" }}
          submitLabel="Save changes"
          cancelHref={"/clients/" + client.id}
        />
      </div>
    </section>
  );
}
