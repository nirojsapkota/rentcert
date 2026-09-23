import { afterAll, beforeEach } from "vitest";
import { db } from "@/server/db";
import { testOutbox } from "@/server/mail/deliver";

// compliance_requirements is configuration seeded by migration, so it is never truncated.
const TABLES = ["stripe_events", "subscriptions", "billing_accounts", "compliance_reminders", "compliance_documents", "compliance_records", "property_requirement_exclusions", "properties", "audit_events", "sessions", "accounts", "verifications", "rate_limits", "account_deletions", "users"];

beforeEach(async () => {
  await db.$executeRawUnsafe(`TRUNCATE ${TABLES.join(", ")} CASCADE`);
  testOutbox.length = 0;
});

afterAll(async () => {
  await db.$disconnect();
});
