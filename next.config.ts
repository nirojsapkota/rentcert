import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// Baseline security headers. A Content-Security-Policy is added during production hardening (Phase 8).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // PDFKit loads its own font data from disk at runtime, so it must not be bundled.
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/properties/[id]/compliance-pack": ["./assets/fonts/**"],
  },
  experimental: {
    // Certificate uploads are up to 10 MB; leave room for the other form fields.
    serverActions: { bodySizeLimit: "11mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// Sentry: browser events go through the same-origin /monitoring tunnel, so the CSP can keep
// connect-src 'self'. Source maps upload only when SENTRY_AUTH_TOKEN is set (CI).
export default withSentryConfig(nextConfig, {
  tunnelRoute: "/monitoring",
  silent: true,
  telemetry: false,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
