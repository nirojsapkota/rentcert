"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

// Shown when a page fails. Plain words, a reference to quote, and no technical details.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  // Server errors carry a digest that also appears in the server logs and Sentry.
  const reference = error.digest;

  return (
    <main className="min-w-0 mx-auto w-full max-w-5xl flex-1 px-4 py-16">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-ink-muted">We couldn&apos;t load this page. Your data is safe. Please try again.</p>
      {reference && <p className="mt-2 text-sm text-ink-muted">Reference: {reference}</p>}
      <div className="mt-6 flex gap-4">
        <button type="button" onClick={reset} className="font-medium text-brand hover:underline">
          Try again
        </button>
        <Link href="/dashboard" className="font-medium text-brand hover:underline">
          Go to your dashboard
        </Link>
      </div>
    </main>
  );
}
