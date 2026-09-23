import { todayIn } from "@/lib/calendar-date";
import { countLandingVisit } from "@/server/analytics/track";

export async function POST() {
  try {
    await countLandingVisit(todayIn("Australia/Melbourne"));
  } catch (error) {
    console.error("[analytics] visit count failed", error instanceof Error ? error.name : "unknown");
  }
  return new Response(null, { status: 204 });
}
