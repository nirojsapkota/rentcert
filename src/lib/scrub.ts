// Removes personal data and secrets from free text (log messages, error reports).
// Shared by the server logger and the Sentry setup, so it must not import server code.
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const SIGNED_URL = /https?:\/\/\S*X-Amz-Signature\S*/gi;
const STORAGE_KEY = /documents\/[A-Za-z0-9_-]+\/[0-9a-f-]{36}/g;
const SECRET = /\b(bearer|token=|secret=|password=)\s*[^\s&"']+/gi;

export function scrub(value: string): string {
  return value
    .replace(SIGNED_URL, "[signed-url]")
    .replace(STORAGE_KEY, "[storage-key]")
    .replace(EMAIL, "[email]")
    .replace(SECRET, "$1[redacted]");
}
