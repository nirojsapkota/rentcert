import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { greetingFor } from "@/lib/greeting";
import { countActiveProperties } from "@/server/properties/queries";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const propertyCount = await countActiveProperties(user.id);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {greetingFor(new Date(), user.timezone ?? "Australia/Melbourne")}, {user.firstName}
        </h1>
        <p className="mt-1 text-ink-muted">Your compliance overview</p>
      </div>

      {propertyCount === 0 ? (
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <h2 className="text-lg font-semibold">Add your first property</h2>
          <p className="mt-1 text-ink-muted">Start tracking your compliance deadlines and certificates.</p>
          <Link href="/properties/new" className={`${buttonClasses("primary")} mt-4`}>
            Add property
          </Link>
        </div>
      ) : (
        <Link href="/properties" className="block max-w-xs rounded-lg border border-line bg-surface p-6 hover:border-brand">
          <span className="block text-3xl font-bold">{propertyCount}</span>
          <span className="text-ink-muted">{propertyCount === 1 ? "Active property" : "Active properties"}</span>
        </Link>
      )}
    </section>
  );
}
