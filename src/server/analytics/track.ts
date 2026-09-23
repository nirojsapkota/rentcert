import "server-only";
import { reportError } from "@/server/observability";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

export type ProductEventName =
  | "signup"
  | "property_created"
  | "compliance_record_created"
  | "document_uploaded"
  | "reminder_sent"
  | "compliance_pack_downloaded"
  | "checkout_started"
  | "subscription_started";

// Records a product event. Analytics must never break the action being measured, so failures
// are logged and swallowed. Never pass addresses, filenames or document data.
export async function track(name: ProductEventName, userId: string | null, client: Prisma.TransactionClient = db) {
  try {
    await client.productEvent.create({ data: { name, userId } });
  } catch (error) {
    reportError("analytics", `could not record ${name}`, error);
  }
}

export async function countLandingVisit(day: string) {
  await db.$executeRaw`
    INSERT INTO landing_visits (day, count) VALUES (${day}::date, 1)
    ON CONFLICT (day) DO UPDATE SET count = landing_visits.count + 1`;
}
