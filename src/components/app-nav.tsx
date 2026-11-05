"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LANDLORD_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/properties", label: "Properties" },
  { href: "/documents", label: "Documents" },
  { href: "/sharing", label: "Sharing" },
  { href: "/billing", label: "Billing" },
  { href: "/account", label: "Account" },
] as const;

const INSPECTOR_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/pools", label: "Pools" },
  { href: "/account", label: "Account" },
] as const;

// Plain text links on the ink app bar. The current page gets a yellow underline.
export function AppNav({ isAdmin = false, isInspector = false }: { isAdmin?: boolean; isInspector?: boolean }) {
  const LINKS = isInspector ? INSPECTOR_LINKS : LANDLORD_LINKS;
  const pathname = usePathname();
  return (
    // Wraps on narrow screens so every section stays visible (no hidden sideways scroll).
    <nav aria-label="Primary" className="w-full lg:w-auto lg:flex-1">
      <ul className="-mx-2 flex flex-wrap">
        {[...LINKS, ...(isAdmin ? [{ href: "/admin", label: "Admin" } as const] : [])].map(({ href, label }) => {
          const current = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className="block border-b-2 border-transparent px-2 py-3 text-sm font-medium whitespace-nowrap text-bar-muted hover:text-white aria-[current=page]:border-tag aria-[current=page]:text-white lg:py-4"
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
