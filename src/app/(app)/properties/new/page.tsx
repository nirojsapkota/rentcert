import type { Metadata } from "next";
import { requireUser } from "@/server/session";
import { createPropertyAction } from "../actions";
import { PropertyForm } from "../property-form";

export const metadata: Metadata = { title: "Add property" };

export default async function NewPropertyPage() {
  await requireUser();
  return (
    <section className="max-w-2xl">
      <h1 className="text-2xl font-bold">Add property</h1>
      <div className="mt-6 rounded-lg border border-line bg-surface p-6">
        <PropertyForm action={createPropertyAction} initialValues={{}} submitLabel="Add property" cancelHref="/properties" />
      </div>
    </section>
  );
}
