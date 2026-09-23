import "server-only";

// Public base URL of the app, used for links in emails.
export function appUrl(path: string): string {
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}
