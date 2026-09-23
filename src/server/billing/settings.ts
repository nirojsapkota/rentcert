import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

export const DEFAULT_TRIAL_DAYS = 365;

// Admin-managed settings live in app_settings. Missing or invalid values fall back to defaults.
export async function trialDays(client: Prisma.TransactionClient = db): Promise<number> {
  const row = await client.appSetting.findUnique({ where: { key: "trial_days" } });
  const value = typeof row?.value === "number" ? row.value : Number(row?.value);
  return Number.isInteger(value) && value >= 0 && value <= 730 ? value : DEFAULT_TRIAL_DAYS;
}
