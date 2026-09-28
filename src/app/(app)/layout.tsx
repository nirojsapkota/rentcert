import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { SiteFooter } from "@/components/site-footer";
import { getEntitlement } from "@/server/billing/entitlements";
import { countOwnedProperties } from "@/server/properties/queries";
import { requireUser } from "@/server/session";

// Shell only. Each page also calls requireUser(), because layouts do not re-run on navigation.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const [entitlement, ownedCount] = await Promise.all([getEntitlement(user.id), countOwnedProperties(user.id)]);
  // A collaborator without properties of their own works under the owner's plan, so their own
  // ended trial does not matter.
  const showReadOnly = entitlement.plan === "READ_ONLY" && ownedCount > 0;
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-3 lg:order-last">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft font-display font-bold text-accent-ink"
            >
              {user.firstName.charAt(0).toUpperCase()}
            </span>
            <span className="hidden text-sm text-ink-muted sm:inline">{user.email}</span>
            <SignOutButton />
          </div>
          <AppNav isAdmin={user.role === "ADMIN"} />
        </div>
      </header>
      {showReadOnly && (
        <div role="status" className="border-b border-warning/40 bg-warning-soft">
          <p className="mx-auto max-w-6xl px-4 py-2 text-sm text-warning">
            Your free trial has ended. Your records are still here, but reminders are paused.{" "}
            <Link href="/billing" className="font-medium underline">
              Choose a plan
            </Link>
          </p>
        </div>
      )}
      <main className="min-w-0 mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <SiteFooter />
    </>
  );
}
