import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { listClients, type RegisterView } from "@/server/barrier/queries";
import { requireInspector } from "@/server/session";

export const metadata: Metadata = { title: "Clients" };

function href(view: RegisterView, page: number, q: string) {
  const params = new URLSearchParams();
  if (view === "archived") params.set("view", "archived");
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? "/clients?" + query : "/clients";
}

export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  const query = await searchParams;
  const user = await requireInspector();
  const view: RegisterView = query.view === "archived" ? "archived" : "active";
  const q = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const requestedPage = Number.parseInt(String(query.page ?? "1"), 10);
  const { items, total, page, pageCount } = await listClients(user.id, { view, page: requestedPage, search: q });

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-deep">Clients</h1>
        <Link href="/clients/new" className={buttonClasses("primary")}>
          Add client
        </Link>
      </div>

      <form action="/clients" role="search" className="flex gap-2">
        {view === "archived" && <input type="hidden" name="view" value="archived" />}
        <label htmlFor="q" className="sr-only">
          Search clients
        </label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Search by name or email" className="block w-full rounded-md border border-line bg-surface px-3 py-2 text-base" />
        <button type="submit" className={buttonClasses("secondary")}>
          Search
        </button>
      </form>

      <nav aria-label="Client views" className="flex gap-1 border-b border-line">
        {(["active", "archived"] as const).map((option) => (
          <Link
            key={option}
            href={href(option, 1, q)}
            aria-current={view === option ? "page" : undefined}
            className="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink aria-[current=page]:border-brand aria-[current=page]:text-ink"
          >
            {option === "active" ? "Active" : "Archived"}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="text-ink-muted">{q ? "No clients match your search." : view === "active" ? "You have no clients yet." : "You have no archived clients."}</p>
      ) : (
        <>
          <p className="text-sm text-ink-muted">
            {total} {view} {total === 1 ? "client" : "clients"}
          </p>
          <ul className="divide-y divide-line border-y border-line bg-surface">
            {items.map((client) => (
              <li key={client.id}>
                <Link href={"/clients/" + client.id} className="block px-4 py-4 hover:bg-canvas">
                  <span className="block font-semibold">{client.name}</span>
                  <span className="block text-sm text-ink-muted">
                    {[client.email, client.phone].filter(Boolean).join(" · ") || "No contact details"}
                  </span>
                  <span className="mt-1 block text-sm text-ink-muted">
                    {client._count.pools} active {client._count.pools === 1 ? "pool or spa" : "pools and spas"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {pageCount > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
              {page > 1 ? (
                <Link href={href(view, page - 1, q)} className="font-medium text-brand hover:underline">
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-ink-muted">
                Page {page} of {pageCount}
              </span>
              {page < pageCount ? (
                <Link href={href(view, page + 1, q)} className="font-medium text-brand hover:underline">
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
