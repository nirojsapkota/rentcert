import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { SiteFooter } from "@/components/site-footer";
import { requireUser } from "@/server/session";

// Shell only. Each page also calls requireUser(), because layouts do not re-run on navigation.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
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
          <AppNav />
        </div>
      </header>
      <main className="min-w-0 mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <SiteFooter />
    </>
  );
}
