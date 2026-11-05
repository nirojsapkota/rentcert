import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { todayIn } from "@/lib/calendar-date";
import { getPool } from "@/server/barrier/queries";
import { requireInspector } from "@/server/session";
import { createInspectionAction } from "../../../inspection-actions";
import { InspectionForm } from "../../../inspection-form";

export const metadata: Metadata = { title: "Log inspection" };

export default async function NewInspectionPage({ params }: PageProps<"/pools/[id]/inspections/new">) {
  const { id } = await params;
  const user = await requireInspector();
  const pool = await getPool(user.id, id);
  if (!pool || pool.archivedAt) notFound();

  return (
    <section className="max-w-2xl">
      <h1 className="text-3xl font-bold text-deep">Log inspection</h1>
      <p className="text-ink-muted">
        {pool.addressLine1}, {pool.suburb}
      </p>
      <div className="mt-6 rounded-lg border border-line bg-surface p-6">
        <InspectionForm
          action={createInspectionAction.bind(null, pool.id)}
          initialValues={{ inspectedOn: todayIn(user.timezone ?? "Australia/Melbourne") }}
          submitLabel="Save inspection"
          cancelHref={`/pools/${pool.id}`}
        />
      </div>
    </section>
  );
}
