"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CreditCard,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  UserRound,
  Users,
  Waves,
  type LucideIcon,
} from "lucide-react";

type NavLink = { href: string; label: string; Icon: LucideIcon };

const LANDLORD_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/properties", label: "Properties", Icon: Building2 },
  { href: "/documents", label: "Documents", Icon: FileText },
  { href: "/sharing", label: "Sharing", Icon: Users },
  { href: "/billing", label: "Billing", Icon: CreditCard },
  { href: "/account", label: "Account", Icon: UserRound },
];

const INSPECTOR_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/clients", label: "Clients", Icon: Users },
  { href: "/pools", label: "Pools", Icon: Waves },
  { href: "/account", label: "Account", Icon: UserRound },
];

const ADMIN_LINK: NavLink = { href: "/admin", label: "Admin", Icon: ShieldCheck };

// Navy sidebar nav. On large screens a vertical list with icons; on smaller screens the same links
// wrap in the header so every section stays visible without a menu button.
export function AppNav({ isAdmin = false, isInspector = false }: { isAdmin?: boolean; isInspector?: boolean }) {
  const links = [...(isInspector ? INSPECTOR_LINKS : LANDLORD_LINKS), ...(isAdmin ? [ADMIN_LINK] : [])];
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="w-full">
      <ul className="flex flex-wrap gap-1 lg:flex-col lg:gap-1.5">
        {links.map(({ href, label, Icon }) => {
          const current = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap text-bar-muted hover:bg-white/10 hover:text-white aria-[current=page]:bg-brand aria-[current=page]:text-white lg:gap-3 lg:px-3.5 lg:py-2.5 lg:text-[0.9375rem]"
              >
                <Icon aria-hidden="true" className="hidden h-5 w-5 shrink-0 lg:block" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
