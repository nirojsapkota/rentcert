import { rm } from "node:fs/promises";
import { Client } from "pg";
import { E2E_DATABASE_URL } from "../../playwright.config";

// Start every run from an empty database and an empty mail folder.
export default async function globalSetup() {
  const client = new Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  await client.query(
    "TRUNCATE audit_events, sessions, accounts, verifications, rate_limits, account_deletions, users CASCADE",
  );
  await client.end();
  await rm("tmp/mail", { recursive: true, force: true });
}
