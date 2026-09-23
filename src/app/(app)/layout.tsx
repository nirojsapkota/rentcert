import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { SiteFooter } from "@/components/site-footer";
import { getEntitlement } from "@/server/billing/entitlements";
import { requireUser } from "@/server/session";

// Shell only. Each page also calls requireUser(), because layouts do not re-run on navigation.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const entitlement = await getEntitlement(user.id);
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex items-center justify-between pt-4">
            <Link href="/dashboard" className="text-lg font-bold">
              RentCert
            </Link>
            <div className="flex items-center gap-4">
              <span className="hidden text-sm text-ink-muted sm:inline">{user.email}</span>
              <SignOutButton />
            </div>
          </div>
          <AppNav isAdmin={user.role === "ADMIN"} />
        </div>
      </header>
      {entitlement.plan === "READ_ONLY" && (
        <div role="status" className="border-b border-warning/40 bg-warning-soft">
          <p className="mx-auto max-w-5xl px-4 py-2 text-sm text-warning">
            Your free trial has ended. Your records are still here, but reminders are paused.{" "}
            <Link href="/billing" className="font-medium underline">
              Choose a plan
            </Link>
          </p>
        </div>
      )}
      <main className="min-w-0 mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <SiteFooter />
    </>
  );
}
