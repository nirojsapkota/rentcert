import "server-only";
import pino from "pino";
import { scrub } from "@/lib/scrub";

export { scrub };

// Structured JSON logs for web and worker. Never log secrets or personal data: these paths are
// redacted wherever they appear in a log object, and string values are scrubbed below.
const REDACT_PATHS = [
  "password",
  "*.password",
  "token",
  "*.token",
  "cookie",
  "*.cookie",
  "headers.cookie",
  "headers.authorization",
  "req.headers.cookie",
  "req.headers.authorization",
  "authorization",
  "*.authorization",
  "email",
  "*.email",
  "to",
  "storageKey",
  "*.storageKey",
  "url",
  "*.url",
  "signedUrl",
];

export function createLogger(destination?: pino.DestinationStream) {
  return pino(
    {
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "test" ? "silent" : "info"),
  base: { service: process.env.SERVICE_NAME ?? "web" },
  redact: { paths: REDACT_PATHS, censor: "[redacted]" },
  formatters: { level: (label) => ({ level: label }) },
  hooks: {
    logMethod(args, method) {
      // Scrub free-text messages as well as structured fields.
      method.apply(
        this,
        args.map((arg) => (typeof arg === "string" ? scrub(arg) : arg)) as Parameters<typeof method>,
      );
    },
  },
    },
    destination,
  );
}

export const logger = createLogger();

// Short, safe description of an error: its name only, never the message (which can contain data).
export function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "unknown";
}
