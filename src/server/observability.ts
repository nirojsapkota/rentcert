import "server-only";
import * as Sentry from "@sentry/nextjs";
import { errorName, logger } from "@/server/logger";

// Logs an unexpected error (name only) and reports it to Sentry when configured.
export function reportError(module: string, message: string, error: unknown) {
  logger.error({ module, error: errorName(error) }, message);
  Sentry.captureException(error, { tags: { module } });
}
