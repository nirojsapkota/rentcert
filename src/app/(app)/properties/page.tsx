import type { Metadata } from "next";
import Link from "next/link";
import { localityLine, propertyTitle, streetLine } from "@/components/property-address";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { formatCalendarDate } from "@/lib/calendar-date";
import { listPropertiesForUser, type PropertyView } from "@/server/properties/queries";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Properties" };

function pageHref(view: PropertyView, page: number) {
  const params = new URLSearchParams();
  if (view === "archived") params.set("view", "archived");
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/properties?${query}` : "/properties";
}

export default async function PropertiesPage({ searchParams }: PageProps<"/properties">) {
  const { view: viewParam, page: pageParam, deleted } = await searchParams;
  const user = await requireUser();
  const view: PropertyView = viewParam === "archived" ? "archived" : "active";
  const requestedPage = Number.parseInt(String(pageParam ?? "1"), 10);
  const { items, total, page, pageCount } = await listPropertiesForUser(user.id, {
    view,
    page: Number.isFinite(requestedPage) ? requestedPage : 1,
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Properties</h1>
        <Link href="/properties/new" className={buttonClasses("primary")}>
          Add property
        </Link>
      </div>

      {deleted === "1" && <Alert tone="success">The property has been deleted.</Alert>}

      <nav aria-label="Property views" className="flex gap-1 border-b border-line">
        {(["active", "archived"] as const).map((option) => (
          <Link
            key={option}
            href={pageHref(option, 1)}
            aria-current={view === option ? "page" : undefined}
            className="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink aria-[current=page]:border-brand aria-[current=page]:text-ink"
          >
            {option === "active" ? "Active" : "Archived"}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        view === "active" ? (
          <div className="rounded-lg border border-line bg-surface p-8 text-center">
            <h2 className="text-lg font-semibold">Add your first property</h2>
            <p className="mt-1 text-ink-muted">Start tracking your compliance deadlines and certificates.</p>
            <Link href="/properties/new" className={`${buttonClasses("primary")} mt-4`}>
              Add property
            </Link>
          </div>
        ) : (
          <p className="text-ink-muted">You have no archived properties.</p>
        )
      ) : (
        <>
          <p className="text-sm text-ink-muted">
            {total} {view} {total === 1 ? "property" : "properties"}
          </p>
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {items.map((property) => (
              <li key={property.id}>
                <Link href={`/properties/${property.id}`} className="block px-4 py-4 hover:bg-canvas">
                  <span className="block font-semibold">{propertyTitle(property)}</span>
                  <span className="block text-sm text-ink-muted">
                    {property.nickname && <>{streetLine(property)}, </>}
                    {localityLine(property)}
                  </span>
                  {property.leaseStartDate && (
                    <span className="mt-1 block text-sm text-ink-muted">
                      Lease started {formatCalendarDate(property.leaseStartDate)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          {pageCount > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
              {page > 1 ? (
                <Link href={pageHref(view, page - 1)} className="font-medium text-brand hover:underline">
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-ink-muted">
                Page {page} of {pageCount}
              </span>
              {page < pageCount ? (
                <Link href={pageHref(view, page + 1)} className="font-medium text-brand hover:underline">
                  Next →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </section>
  );
}
