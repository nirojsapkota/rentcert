import "server-only";
import { propertyTitle } from "@/components/property-address";
import { formatCalendarDate, toCalendarDateString, todayIn } from "@/lib/calendar-date";
import { daysRemaining } from "@/server/compliance/status";
import { listReminderCandidates } from "@/server/compliance/queries";
import { db } from "@/server/db";
import { sendReminderEmail } from "@/server/mail/messages";

export const MAX_SEND_ATTEMPTS = 5;

export type SendOutcome = "sent" | "skipped" | "already_done";

// Short, non-personal error code for the reminder row.
function errorCode(error: unknown): string {
  return (error instanceof Error ? error.name : "UnknownError").slice(0, 60);
}

// Sends one claimed reminder. Only a PENDING reminder is sent, and it is re-checked first, so a
// retried job never sends twice after success and never sends a reminder that no longer applies.
export async function sendReminder(reminderId: string): Promise<SendOutcome> {
  const reminder = await db.complianceReminder.findUnique({
    where: { id: reminderId },
    include: {
      complianceRecord: {
        select: {
          id: true,
          nextDueOn: true,
          requirement: { select: { name: true } },
          property: {
            select: {
              id: true,
              nickname: true,
              addressLine1: true,
              addressLine2: true,
              suburb: true,
              state: true,
              postcode: true,
              user: { select: { email: true, notificationEmail: true, firstName: true, timezone: true } },
            },
          },
        },
      },
    },
  });
  if (!reminder || reminder.status !== "PENDING") return "already_done";

  const [stillApplies] = await listReminderCandidates({ recordIds: [reminder.complianceRecordId] });
  if (!stillApplies) {
    await db.complianceReminder.updateMany({ where: { id: reminder.id, status: "PENDING" }, data: { status: "SKIPPED" } });
    return "skipped";
  }

  const { complianceRecord: record } = reminder;
  const user = record.property.user;
  try {
    await sendReminderEmail(user.notificationEmail ?? user.email, user.firstName, {
      type: reminder.reminderType,
      checkName: record.requirement.name,
      propertyLabel: propertyTitle(record.property),
      propertyId: record.property.id,
      dueDate: formatCalendarDate(record.nextDueOn),
      daysRemaining: daysRemaining(toCalendarDateString(record.nextDueOn), todayIn(user.timezone)),
    });
  } catch (error) {
    const attempts = reminder.attempts + 1;
    await db.complianceReminder.update({
      where: { id: reminder.id },
      data: { attempts, lastError: errorCode(error), status: attempts >= MAX_SEND_ATTEMPTS ? "FAILED" : "PENDING" },
    });
    throw error; // let the queue retry with backoff
  }

  await db.complianceReminder.update({
    where: { id: reminder.id },
    data: { status: "SENT", sentAt: new Date(), attempts: reminder.attempts + 1, lastError: null },
  });
  return "sent";
}
