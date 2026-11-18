import "server-only";
import { db } from "@/server/db";
import { accessibleBy } from "@/server/properties/access";

// Reminders sent to the user about their own properties, for the account data export.
export async function listRemindersForExport(userId: string) {
  return db.complianceReminder.findMany({
    where: { userId, complianceRecord: { property: { userId } } },
    select: { id: true, complianceRecordId: true, reminderType: true, scheduledFor: true, status: true, sentAt: true },
    orderBy: { createdAt: "asc" },
  });
}

// Reminders that failed after all retries since `since` (for operational alerts).
export async function countFailedReminders(since: Date) {
  return db.complianceReminder.count({ where: { status: "FAILED", updatedAt: { gte: since } } });
}

// Reminders recently emailed to this user about properties they can still see, newest first.
// For the dashboard's recent activity; each row is one email to this user.
export async function listRecentRemindersSent(userId: string, limit = 5) {
  return db.complianceReminder.findMany({
    where: {
      userId,
      status: "SENT",
      complianceRecord: { property: { ...accessibleBy(userId), archivedAt: null } },
    },
    select: {
      id: true,
      reminderType: true,
      sentAt: true,
      complianceRecord: {
        select: {
          requirement: { select: { name: true } },
          property: { select: { id: true, nickname: true, addressLine1: true, addressLine2: true, suburb: true, state: true, postcode: true } },
        },
      },
    },
    orderBy: { sentAt: "desc" },
    take: limit,
  });
}
