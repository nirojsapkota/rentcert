import type { Metadata } from "next";
import { requireInspector } from "@/server/session";
import { createClientAction } from "../actions";
import { ClientForm } from "../client-form";

export const metadata: Metadata = { title: "Add client" };

export default async function NewClientPage() {
  await requireInspector();
  return (
    <section className="max-w-2xl">
      <h1 className="text-3xl font-bold text-deep">Add client</h1>
      <div className="mt-6 rounded-lg border border-line bg-surface p-6">
        <ClientForm action={createClientAction} initialValues={{}} submitLabel="Add client" cancelHref="/clients" />
      </div>
    </section>
  );
}
