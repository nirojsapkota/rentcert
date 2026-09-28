import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { propertyTitle } from "@/components/property-address";
import { todayIn } from "@/lib/calendar-date";
import { getPropertySchedule } from "@/server/compliance/queries";
import { requireUser } from "@/server/session";
import { recordCompletionAction } from "../../../../compliance-actions";
import { CompletionForm } from "../../../../completion-form";

export const metadata: Metadata = { title: "Mark check completed" };

export default async function CompleteCheckPage({ params }: PageProps<"/properties/[id]/checks/[code]/complete">) {
  const { id, code } = await params;
  const user = await requireUser();
  const today = todayIn(user.timezone ?? "Australia/Melbourne");
  const schedule = await getPropertySchedule(user.id, id, today);
  const item = schedule?.items.find((entry) => entry.requirement.code === code);
  if (!schedule || !item || item.status === "not_applicable") notFound();

  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-deep">Mark {item.requirement.name.toLowerCase()} completed</h1>
        <p className="mt-1 text-ink-muted">{propertyTitle(schedule.property)}</p>
      </div>
      <div className="rounded-lg border border-line bg-surface p-6">
        <CompletionForm
          action={recordCompletionAction.bind(null, schedule.property.id, code)}
          initialValues={{ completedOn: today }}
          today={today}
          submitLabel="Save completed check"
          cancelHref={`/properties/${schedule.property.id}`}
          allowUpload
        />
      </div>
    </section>
  );
}
