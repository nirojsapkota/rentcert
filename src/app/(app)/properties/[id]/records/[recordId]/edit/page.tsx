import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { toCalendarDateString, todayIn } from "@/lib/calendar-date";
import { findRecordForUser } from "@/server/compliance/queries";
import { requireUser } from "@/server/session";
import { updateRecordAction } from "../../../../compliance-actions";
import { CompletionForm } from "../../../../completion-form";

export const metadata: Metadata = { title: "Edit compliance record" };

export default async function EditRecordPage({ params }: PageProps<"/properties/[id]/records/[recordId]/edit">) {
  const { id, recordId } = await params;
  const user = await requireUser();
  const record = await findRecordForUser(user.id, id, recordId);
  if (!record || record.kind !== "COMPLETED" || !record.completedOn) notFound();
  const today = todayIn(user.timezone ?? "Australia/Melbourne");

  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-deep">Edit {record.requirement.name.toLowerCase()} record</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Changes are kept in your account history. The next due date is recalculated from the completed date.
        </p>
      </div>
      <div className="rounded-lg border border-line bg-surface p-6">
        <CompletionForm
          action={updateRecordAction.bind(null, record.propertyId, record.id)}
          initialValues={{
            completedOn: toCalendarDateString(record.completedOn),
            providerName: record.providerName ?? "",
            providerLicenceNumber: record.providerLicenceNumber ?? "",
            notes: record.notes ?? "",
          }}
          today={today}
          submitLabel="Save changes"
          cancelHref={`/properties/${record.propertyId}`}
        />
      </div>
    </section>
  );
}
