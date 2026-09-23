import { afterAll, beforeEach } from "vitest";
import { db } from "@/server/db";
import { testOutbox } from "@/server/mail/deliver";

const TABLES = ["properties", "audit_events", "sessions", "accounts", "verifications", "rate_limits", "account_deletions", "users"];

beforeEach(async () => {
  await db.$executeRawUnsafe(`TRUNCATE ${TABLES.join(", ")} CASCADE`);
  testOutbox.length = 0;
});

afterAll(async () => {
  await db.$disconnect();
});
