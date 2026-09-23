import type { Metadata } from "next";
import { recordAdminView } from "@/server/admin/commands";
import { getMetrics } from "@/server/admin/queries";
import { requireAdmin } from "@/server/session";
import { AdminNav, tableWrap, td, th } from "./admin-nav";

export const metadata: Metadata = { title: "Admin" };

const COLUMNS = [
  ["visits", "Landing visits"],
  ["signups", "Sign-ups"],
  ["propertiesCreated", "Properties added"],
  ["firstCertificates", "First certificate"],
  ["remindersSent", "Reminders sent"],
  ["packsDownloaded", "Packs downloaded"],
  ["checkoutsStarted", "Checkouts started"],
  ["subscriptionsStarted", "Paid starts"],
  ["cancellations", "Cancellations"],
] as const;

export default async function AdminPage() {
  const admin = await requireAdmin();
  await recordAdminView(admin.id, "metrics");
  const metrics = await getMetrics();

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      <AdminNav current="/admin" />
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <li className="rounded-lg border border-line bg-surface p-4">
          <span className="block text-3xl font-bold">${metrics.mrr}</span>
          <span className="text-sm text-ink-muted">MRR (AUD, incl. GST)</span>
        </li>
        <li className="rounded-lg border border-line bg-surface p-4">
          <span className="block text-3xl font-bold">{metrics.activeSubscriptions}</span>
          <span className="text-sm text-ink-muted">Active subscriptions</span>
        </li>
      </ul>
      <div className={tableWrap}>
        <table className="w-full min-w-[56rem] text-sm">
          <caption className="sr-only">Monthly funnel</caption>
          <thead className="border-b border-line bg-canvas text-ink-muted">
            <tr>
              <th scope="col" className={th}>Month</th>
              {COLUMNS.map(([, label]) => (
                <th key={label} scope="col" className={th}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {metrics.months.map((row) => (
              <tr key={row.month}>
                <th scope="row" className={`${td} font-medium`}>{row.month}</th>
                {COLUMNS.map(([key]) => (
                  <td key={key} className={td}>{row[key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
