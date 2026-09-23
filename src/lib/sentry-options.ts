import type { ErrorEvent, EventHint } from "@sentry/core";
import { scrub } from "@/lib/scrub";

// Shared Sentry settings for browser, server, edge and worker. Sentry stays off without a DSN.
// Events carry no personal data: no cookies, headers, query strings, request bodies or emails.
export function beforeSend(event: ErrorEvent, _hint?: EventHint): ErrorEvent | null {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.query_string;
    delete event.request.data;
    if (event.request.url) event.request.url = event.request.url.split("?")[0];
  }
  event.user = event.user?.id ? { id: String(event.user.id) } : undefined;
  if (event.message) event.message = scrub(event.message);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = scrub(exception.value);
  }
  for (const breadcrumb of event.breadcrumbs ?? []) {
    if (breadcrumb.message) breadcrumb.message = scrub(breadcrumb.message);
    if (breadcrumb.data?.url && typeof breadcrumb.data.url === "string") breadcrumb.data.url = breadcrumb.data.url.split("?")[0];
  }
  return event;
}

export const sharedSentryOptions = {
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  beforeSend,
};
