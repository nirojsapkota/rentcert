import "server-only";
import { db } from "@/server/db";
import { sendWelcomeEmail } from "@/server/mail/messages";

// Sends the welcome email at most once: the user row is claimed first, and released again if
// the send fails so a retry can try again.
export async function sendWelcome(userId: string): Promise<"sent" | "already_done"> {
  const claimedAt = new Date();
  const { count } = await db.user.updateMany({
    where: { id: userId, emailVerified: true, welcomeEmailSentAt: null },
    data: { welcomeEmailSentAt: claimedAt },
  });
  if (count === 0) return "already_done";

  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, firstName: true } });
  try {
    await sendWelcomeEmail({ email: user.email, name: user.firstName });
  } catch (error) {
    await db.user.updateMany({ where: { id: userId, welcomeEmailSentAt: claimedAt }, data: { welcomeEmailSentAt: null } });
    throw error;
  }
  return "sent";
}
