import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="min-w-0 flex flex-1 items-start justify-center px-4 py-12 sm:items-center">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-6 block text-center text-xl font-bold">
            RentCert
          </Link>
          <div className="rounded-lg border border-line bg-surface p-6 shadow-sm sm:p-8">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
