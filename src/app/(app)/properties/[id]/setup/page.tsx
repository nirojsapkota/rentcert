import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { propertyTitle } from "@/components/property-address";
import { todayIn } from "@/lib/calendar-date";
import { getPropertySchedule } from "@/server/compliance/queries";
import { requireUser } from "@/server/session";
import { setUpChecksAction } from "../../compliance-actions";
import { SetupForm } from "../../setup-form";

export const metadata: Metadata = { title: "Set up compliance dates" };

export default async function SetupPage({ params }: PageProps<"/properties/[id]/setup">) {
  const { id } = await params;
  const user = await requireUser();
  const today = todayIn(user.timezone ?? "Australia/Melbourne");
  const schedule = await getPropertySchedule(user.id, id, today);
  if (!schedule) notFound();

  const pending = schedule.items.filter((item) => item.status === "not_set_up").map((item) => item.requirement);
  if (pending.length === 0) redirect(`/properties/${schedule.property.id}`);
  const codes = pending.map((requirement) => requirement.code);

  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Review compliance dates</h1>
        <p className="mt-1 text-ink-muted">{propertyTitle(schedule.property)}</p>
      </div>
      <p className="text-sm text-ink-muted">
        Tell us when each check was last done. RentCert uses the dates you provide to calculate reminders. Confirm the
        applicable compliance date with your licensed provider or the official guidance for your state or territory.
      </p>
      {schedule.isGeneric && (
        <p className="rounded-md border border-line bg-canvas px-4 py-3 text-sm">
          RentCert has not yet researched the rules for {schedule.property.state}. These checks use a general reminder
          schedule. Mark any that don&apos;t apply as not applicable.
        </p>
      )}
      <SetupForm
        action={setUpChecksAction.bind(null, schedule.property.id, codes)}
        requirements={pending.map(({ code, name, description }) => ({ code, name, description }))}
        today={today}
      />
    </section>
  );
}
