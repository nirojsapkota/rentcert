import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { listPools, type RegisterView } from "@/server/barrier/queries";
import { requireInspector } from "@/server/session";

export const metadata: Metadata = { title: "Pools" };

function href(view: RegisterView, page: number, q: string) {
  const params = new URLSearchParams();
  if (view === "archived") params.set("view", "archived");
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? "/pools?" + query : "/pools";
}

export default async function PoolsPage({ searchParams }: PageProps<"/pools">) {
  const query = await searchParams;
  const user = await requireInspector();
  const view: RegisterView = query.view === "archived" ? "archived" : "active";
  const q = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const requestedPage = Number.parseInt(String(query.page ?? "1"), 10);
  const { items, total, page, pageCount } = await listPools(user.id, { view, page: requestedPage, search: q });

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-deep">Pools and spas</h1>
        <Link href="/pools/new" className={buttonClasses("primary")}>
          Add pool or spa
        </Link>
      </div>

      <form action="/pools" role="search" className="flex gap-2">
        {view === "archived" && <input type="hidden" name="view" value="archived" />}
        <label htmlFor="q" className="sr-only">
          Search pools
        </label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Search by address, suburb, postcode or client" className="block w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-base" />
        <button type="submit" className={buttonClasses("secondary")}>
          Search
        </button>
      </form>

      <nav aria-label="Pool views" className="flex gap-1 border-b border-line">
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
        <p className="text-ink-muted">{q ? "No pools match your search." : view === "active" ? "You have no pools or spas yet." : "You have no archived pools or spas."}</p>
      ) : (
        <>
          <p className="text-sm text-ink-muted">
            {total} {view} {total === 1 ? "pool or spa" : "pools and spas"}
          </p>
          <ul className="divide-y divide-line border-y border-line bg-surface">
            {items.map((pool) => (
              <li key={pool.id}>
                <Link href={"/pools/" + pool.id} className="block px-4 py-4 hover:bg-canvas">
                  <span className="block font-semibold">{pool.addressLine2 ? pool.addressLine1 + ", " + pool.addressLine2 : pool.addressLine1}</span>
                  <span className="block text-sm text-ink-muted">
                    {pool.kind === "SPA" ? "Spa" : "Pool"} · {pool.suburb} VIC {pool.postcode}
                  </span>
                  <span className="mt-1 block text-sm text-ink-muted">Client: {pool.client.name}</span>
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
