import { reportError } from "@/server/observability";
import { todayIn } from "@/lib/calendar-date";
import { countLandingVisit } from "@/server/analytics/track";

export async function POST() {
  try {
    await countLandingVisit(todayIn("Australia/Melbourne"));
  } catch (error) {
    reportError("analytics", "visit count failed", error);
  }
  return new Response(null, { status: 204 });
}
