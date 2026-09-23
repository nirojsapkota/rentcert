import Link from "next/link";

const LINKS = [
  ["/admin", "Metrics"],
  ["/admin/users", "Users"],
  ["/admin/properties", "Properties"],
  ["/admin/subscriptions", "Subscriptions"],
  ["/admin/requirements", "Requirements"],
  ["/admin/settings", "Settings"],
] as const;

export function AdminNav({ current }: { current: string }) {
  return (
    <nav aria-label="Admin" className="flex flex-wrap gap-2">
      {LINKS.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={current === href ? "page" : undefined}
          className="rounded-full border border-line bg-surface px-3 py-1 text-sm font-medium text-ink-muted aria-[current=page]:border-brand aria-[current=page]:bg-brand aria-[current=page]:text-white"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function Pager({ base, page, pageCount }: { base: string; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const href = (n: number) => `${base}${base.includes("?") ? "&" : "?"}page=${n}`;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
      {page > 1 ? <Link href={href(page - 1)} className="text-brand hover:underline">← Previous</Link> : <span />}
      <span className="text-ink-muted">Page {page} of {pageCount}</span>
      {page < pageCount ? <Link href={href(page + 1)} className="text-brand hover:underline">Next →</Link> : <span />}
    </nav>
  );
}

export const pageParam = (value: unknown) => {
  const parsed = Number.parseInt(String(value ?? "1"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

export const tableWrap = "relative overflow-x-auto rounded-lg border border-line bg-surface";
export const th = "px-3 py-2 text-left font-medium";
export const td = "px-3 py-2";
