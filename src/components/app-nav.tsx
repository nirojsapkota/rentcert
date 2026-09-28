"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/properties", label: "Properties" },
  { href: "/documents", label: "Documents" },
  { href: "/sharing", label: "Sharing" },
  { href: "/billing", label: "Billing" },
  { href: "/account", label: "Account" },
] as const;

export function AppNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  return (
    // Wraps on narrow screens so every section stays visible (no hidden sideways scroll).
    <nav aria-label="Primary" className="w-full lg:w-auto">
      <ul className="flex flex-wrap gap-1 rounded-3xl bg-canvas p-1 lg:rounded-full">
        {[...LINKS, ...(isAdmin ? [{ href: "/admin", label: "Admin" } as const] : [])].map(({ href, label }) => {
          const current = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className="block whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold text-ink-muted hover:bg-surface hover:text-ink aria-[current=page]:bg-brand aria-[current=page]:text-white"
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
