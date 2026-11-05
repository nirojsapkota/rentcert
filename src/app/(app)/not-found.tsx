import Link from "next/link";

// Inside the app shell, which already renders <main> and the footer.
export default function AppNotFound() {
  return (
    <section className="py-8">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-ink-muted">This page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <Link href="/dashboard" className="mt-6 inline-block font-medium text-brand">
        Go to your dashboard
      </Link>
    </section>
  );
}
