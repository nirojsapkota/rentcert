"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/properties", label: "Properties" },
  { href: "/documents", label: "Documents" },
  { href: "/billing", label: "Billing" },
  { href: "/account", label: "Account" },
] as const;

export function AppNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-1">
        {[...LINKS, ...(isAdmin ? [{ href: "/admin", label: "Admin" } as const] : [])].map(({ href, label }) => {
          const current = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className="block whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm font-medium text-ink-muted hover:text-ink aria-[current=page]:border-brand aria-[current=page]:text-ink"
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
