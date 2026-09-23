"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Last-resort error page when the root layout itself fails. It replaces the whole document.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en-AU">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1rem", maxWidth: "40rem", margin: "0 auto", color: "#1f2933" }}>
        <h1>Something went wrong</h1>
        <p>RentCert couldn&apos;t load. Your data is safe. Please refresh the page in a moment.</p>
        {error.digest && <p style={{ color: "#52606d", fontSize: "0.875rem" }}>Reference: {error.digest}</p>}
      </body>
    </html>
  );
}
