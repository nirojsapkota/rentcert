import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="min-w-0 flex flex-1 items-start justify-center px-4 py-12 sm:items-center">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <Logo />
          </div>
          <div className="rounded-lg border border-line bg-surface p-6 shadow-[0_24px_48px_-32px_rgba(13,59,58,0.35)] sm:p-8">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
