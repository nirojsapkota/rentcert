import type { ReactNode } from "react";
import Link from "next/link";

// White rounded panel. The optional header has an icon, a title and a "view all" style link.
export function Card({
  title,
  titleId,
  icon,
  action,
  className = "",
  children,
}: {
  title?: ReactNode;
  titleId?: string;
  icon?: ReactNode;
  action?: { href: string; label: string };
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={title && titleId ? titleId : undefined}
      className={`rounded-xl border border-line bg-surface p-5 shadow-card ${className}`}
    >
      {title && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="flex items-center gap-2 text-lg font-bold">
            {icon && <span aria-hidden="true" className="text-brand [&>svg]:h-5 [&>svg]:w-5">{icon}</span>}
            {title}
          </h2>
          {action && (
            <Link href={action.href} className="shrink-0 text-sm font-semibold text-brand hover:underline">
              {action.label} <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
