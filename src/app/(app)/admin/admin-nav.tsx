import Link from "next/link";

const LINKS = [
  ["/admin", "Metrics"],
  ["/admin/users", "Users"],
  ["/admin/properties", "Properties"],
  ["/admin/subscriptions", "Subscriptions"],
  ["/admin/requirements", "Requirements"],
  ["/admin/councils", "Councils"],
  ["/admin/settings", "Settings"],
] as const;

export function AdminNav({ current }: { current: string }) {
  return (
    <nav aria-label="Admin" className="flex flex-wrap gap-x-1 border-b border-line">
      {LINKS.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={current === href ? "page" : undefined}
          className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink aria-[current=page]:border-ink aria-[current=page]:text-ink"
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

export const tableWrap = "relative overflow-x-auto border-y border-line bg-surface";
export const th = "px-3 py-2 text-left font-medium";
export const td = "px-3 py-2";
