import { rm } from "node:fs/promises";
import { Client } from "pg";
import { E2E_DATABASE_URL } from "../../playwright.config";
import { startFakeStripe } from "./fake-stripe-server";

// Start every run from an empty database and an empty mail folder.
export default async function globalSetup() {
  const client = new Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  await client.query(
    "TRUNCATE stripe_events, subscriptions, billing_accounts, compliance_reminders, compliance_documents, compliance_records, property_requirement_exclusions, properties, audit_events, sessions, accounts, verifications, rate_limits, account_deletions, users CASCADE",
  );
  await client.end();
  await rm("tmp/mail", { recursive: true, force: true });
  await rm("tmp/e2e-storage", { recursive: true, force: true });

  const fakeStripe = await startFakeStripe("http://localhost:3100");
  return async () => {
    await new Promise((resolve) => fakeStripe.close(resolve));
  };
}
