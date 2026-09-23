import "server-only";
import { db } from "@/server/db";

// Every reminder of the user, for the account data export.
export async function listRemindersForExport(userId: string) {
  return db.complianceReminder.findMany({
    where: { complianceRecord: { property: { userId } } },
    select: { id: true, complianceRecordId: true, reminderType: true, scheduledFor: true, status: true, sentAt: true },
    orderBy: { createdAt: "asc" },
  });
}

// Reminders that failed after all retries since `since` (for operational alerts).
export async function countFailedReminders(since: Date) {
  return db.complianceReminder.count({ where: { status: "FAILED", updatedAt: { gte: since } } });
}
