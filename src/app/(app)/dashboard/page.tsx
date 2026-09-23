import type { Metadata } from "next";
import { greetingFor } from "@/lib/greeting";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  return (
    <section>
      <h1 className="text-2xl font-bold">
        {greetingFor(new Date(), user.timezone ?? "Australia/Melbourne")}, {user.firstName}
      </h1>
      <p className="mt-1 text-ink-muted">Your compliance overview</p>
      <div className="mt-6 rounded-lg border border-line bg-surface p-8 text-center">
        <h2 className="text-lg font-semibold">Add your first property</h2>
        <p className="mt-1 text-ink-muted">Start tracking your compliance deadlines and certificates.</p>
        <p className="mt-4 text-sm text-ink-muted">Adding properties is coming soon.</p>
      </div>
    </section>
  );
}
