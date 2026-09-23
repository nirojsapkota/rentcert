import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { localityLine, propertyTitle, streetLine } from "@/components/property-address";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { formatCalendarDate, todayIn } from "@/lib/calendar-date";
import { getPropertySchedule, listPropertyHistory } from "@/server/compliance/queries";
import { requireUser } from "@/server/session";
import { archivePropertyAction, deletePropertyAction, restorePropertyAction } from "../actions";
import { ComplianceSection } from "../compliance-section";
import { HistoryTable } from "../history-table";

export const metadata: Metadata = { title: "Property" };

export default async function PropertyPage({ params, searchParams }: PageProps<"/properties/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const today = todayIn(user.timezone ?? "Australia/Melbourne");
  const historyPage = Number.parseInt(String(query.history ?? "1"), 10);
  const [schedule, history] = await Promise.all([
    getPropertySchedule(user.id, id, today),
    listPropertyHistory(user.id, id, Number.isFinite(historyPage) ? historyPage : 1),
  ]);
  if (!schedule || !history) notFound();
  const { property } = schedule;
  const completedItem = schedule.items.find((item) => item.requirement.code === query.completed);

  const archived = property.archivedAt !== null;

  return (
    <article className="space-y-6">
      <p>
        <Link href={archived ? "/properties?view=archived" : "/properties"} className="text-sm font-medium text-brand hover:underline">
          ← All properties
        </Link>
      </p>

      {query.saved === "1" && <Alert tone="success">Your changes have been saved.</Alert>}
      {query.recordSaved === "1" && <Alert tone="success">The compliance record has been updated.</Alert>}
      {query.setup === "1" && (
        <Alert tone="success">
          Based on the dates you entered, your next reminder dates are below. These are reminders based on information
          you entered and are not legal advice.
        </Alert>
      )}
      {completedItem && (
        <Alert tone="success">
          {completedItem.requirement.name} saved. Next due:{" "}
          {completedItem.nextDueOn ? formatCalendarDate(new Date(`${completedItem.nextDueOn}T00:00:00Z`)) : "—"}.
        </Alert>
      )}
      {query.uploadFailed === "1" && (
        <Alert tone="error">The check was saved, but the document could not be uploaded. Add it again from the history below.</Alert>
      )}
      {query.delete === "blocked" && (
        <Alert tone="error">This property has compliance history, so it can&apos;t be deleted. Archive it instead.</Alert>
      )}
      {archived && (
        <Alert tone="info">
          This property is archived. It is hidden from your active properties and does not get reminders.
        </Alert>
      )}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{propertyTitle(property)}</h1>
          <p className="mt-1 text-ink-muted">
            {property.nickname && <>{streetLine(property)}, </>}
            {localityLine(property)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/properties/${property.id}/edit`} className={buttonClasses("secondary")}>
            Edit
          </Link>
          <form action={(archived ? restorePropertyAction : archivePropertyAction).bind(null, property.id)}>
            <Button type="submit" variant="secondary">
              {archived ? "Restore" : "Archive"}
            </Button>
          </form>
        </div>
      </header>

      <section aria-labelledby="details-heading" className="rounded-lg border border-line bg-surface p-6">
        <h2 id="details-heading" className="text-lg font-semibold">
          Details
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-ink-muted">Address</dt>
            <dd>
              {streetLine(property)}
              <br />
              {localityLine(property)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">Lease started</dt>
            <dd>{property.leaseStartDate ? formatCalendarDate(property.leaseStartDate) : "Not entered"}</dd>
          </div>
          {property.notes && (
            <div className="sm:col-span-2">
              <dt className="text-sm text-ink-muted">Notes</dt>
              <dd className="whitespace-pre-line">{property.notes}</dd>
            </div>
          )}
        </dl>
      </section>

      <ComplianceSection
        propertyId={property.id}
        state={property.state}
        isGeneric={schedule.isGeneric}
        items={schedule.items}
        archived={archived}
      />

      <HistoryTable propertyId={property.id} history={history} />

      <section aria-labelledby="delete-heading" className="rounded-lg border border-danger/40 bg-surface p-6">
        <h2 id="delete-heading" className="text-lg font-semibold text-danger">
          Delete property
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Deletes this property permanently. Use this for a property added by mistake. A property with compliance
          history can&apos;t be deleted. To stop tracking a property you no longer rent out, archive it instead.
        </p>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-danger">Delete this property…</summary>
          <form action={deletePropertyAction.bind(null, property.id)} className="mt-3">
            <Button type="submit" variant="danger">
              Yes, delete {propertyTitle(property)}
            </Button>
          </form>
        </details>
      </section>
    </article>
  );
}
