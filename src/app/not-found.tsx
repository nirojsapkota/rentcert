import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <>
      <main className="min-w-0 mx-auto w-full max-w-5xl flex-1 px-4 py-16">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-ink-muted">This page doesn&apos;t exist, or you don&apos;t have access to it.</p>
        <Link href="/dashboard" className="mt-6 inline-block font-medium text-brand hover:underline">
          Go to your dashboard
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
