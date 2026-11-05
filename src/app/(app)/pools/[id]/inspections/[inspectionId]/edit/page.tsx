import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { toCalendarDateString } from "@/lib/calendar-date";
import { getInspection } from "@/server/barrier/inspections";
import { requireInspector } from "@/server/session";
import { updateInspectionAction } from "../../../../inspection-actions";
import { InspectionForm } from "../../../../inspection-form";

export const metadata: Metadata = { title: "Edit inspection" };

export default async function EditInspectionPage({ params }: PageProps<"/pools/[id]/inspections/[inspectionId]/edit">) {
  const { id, inspectionId } = await params;
  const user = await requireInspector();
  const inspection = await getInspection(user.id, inspectionId);
  if (!inspection || inspection.poolId !== id) notFound();
  const back = `/pools/${id}/inspections/${inspection.id}`;

  return (
    <section className="max-w-2xl">
      <h1 className="text-3xl font-bold text-deep">Edit inspection</h1>
      <div className="mt-6 rounded-lg border border-line bg-surface p-6">
        <InspectionForm
          action={updateInspectionAction.bind(null, id, inspection.id)}
          initialValues={{
            kind: inspection.kind,
            outcome: inspection.outcome,
            inspectedOn: toCalendarDateString(inspection.inspectedOn),
            lodgedOn: inspection.lodgedOn ? toCalendarDateString(inspection.lodgedOn) : "",
            certificateNumber: inspection.certificateNumber ?? "",
            notes: inspection.notes ?? "",
          }}
          submitLabel="Save changes"
          cancelHref={back}
        />
      </div>
    </section>
  );
}
