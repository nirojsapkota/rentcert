import Link from "next/link";
import { Bell } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { HouseIllustration } from "@/components/illustrations/house";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { SiteFooter } from "@/components/site-footer";
import { todayIn } from "@/lib/calendar-date";
import { getEntitlement } from "@/server/billing/entitlements";
import { getDashboard } from "@/server/compliance/queries";
import { countOwnedProperties } from "@/server/properties/queries";
import { requireUser } from "@/server/session";

function Avatar({ firstName }: { firstName: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white"
    >
      {firstName.charAt(0).toUpperCase()}
    </span>
  );
}

// Shell only. Each page also calls requireUser(), because layouts do not re-run on navigation.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const isInspector = user.accountType === "INSPECTOR";
  const [entitlement, ownedCount, dashboard] = await Promise.all([
    getEntitlement(user.id),
    countOwnedProperties(user.id),
    isInspector
      ? null
      : getDashboard(user.id, todayIn(user.timezone ?? "Australia/Melbourne")),
  ]);
  // A collaborator without properties of their own works under the owner's plan, so their own
  // ended trial does not matter.
  const showReadOnly = entitlement.plan === "READ_ONLY" && ownedCount > 0;
  // Counted when the shell renders (a full page load), so it can lag behind after client navigation.
  const overdue = dashboard?.counts.overdue ?? 0;

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      {/* The outer column fills the page height in navy; the inner panel stays in view while scrolling. */}
      <aside className="on-deep bg-deep pt-[env(safe-area-inset-top)] text-white lg:w-60 lg:shrink-0">
        <div className="lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
          <div className="flex items-center justify-between gap-4 px-4 pt-3 lg:px-5 lg:pt-6 lg:pb-6">
            <Logo href="/dashboard" className="text-white" />
            <div className="flex items-center gap-3 lg:hidden">
              <Avatar firstName={user.firstName} />
              <SignOutButton className="text-white" />
            </div>
          </div>
          <div className="px-2 pt-2 pb-2 lg:px-3 lg:pt-0">
            <AppNav isAdmin={user.role === "ADMIN"} isInspector={isInspector} />
          </div>
          <div className="mt-auto hidden px-5 pb-6 lg:block">
            <HouseIllustration night className="w-full" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="hidden items-center justify-end gap-5 px-8 pt-5 lg:flex">
          {!isInspector && (
            <Link
              href="/dashboard?filter=overdue"
              className="relative rounded-full p-1.5 text-ink hover:bg-brand-soft"
              aria-label={
                overdue === 1 ? "1 overdue check" : `${overdue} overdue checks`
              }
            >
              <Bell aria-hidden="true" className="h-6 w-6" />
              {overdue > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[0.6875rem] font-bold text-white"
                >
                  {overdue}
                </span>
              )}
            </Link>
          )}
          <div className="flex items-center gap-3">
            <Avatar firstName={user.firstName} />
            <span className="text-sm">
              <span className="block font-semibold">{user.name}</span>
              <span className="block text-ink-muted">{user.email}</span>
            </span>
          </div>
          <SignOutButton />
        </div>
        {showReadOnly && (
          <div
            role="status"
            className="mx-4 mt-4 rounded-lg border border-warning/25 bg-warning-soft lg:mx-8"
          >
            <p className="px-4 py-2 text-sm text-warning">
              Your free trial has ended. Your records are still here, but
              reminders are paused.{" "}
              <Link href="/billing" className="font-medium underline">
                Choose a plan
              </Link>
            </p>
          </div>
        )}
        <main className="min-w-0 mx-auto w-full max-w-6xl flex-1 px-4 py-8 lg:px-8">
          {children}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
