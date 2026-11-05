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
      <h1 className="text-3xl font-bold text-deep">Admin</h1>
      <AdminNav current="/admin" />
      <ul className="flex flex-wrap border-y border-line">
        <li className="w-1/2 border-line px-4 py-3 sm:w-auto sm:min-w-48 sm:border-r">
          <span className="block font-mono text-3xl leading-none font-semibold">${metrics.mrr}</span>
          <span className="mt-1.5 block text-sm text-ink-muted">MRR (AUD, incl. GST)</span>
        </li>
        <li className="w-1/2 px-4 py-3 sm:w-auto sm:min-w-48">
          <span className="block font-mono text-3xl leading-none font-semibold">{metrics.activeSubscriptions}</span>
          <span className="mt-1.5 block text-sm text-ink-muted">Active subscriptions</span>
        </li>
      </ul>
      <div className={tableWrap}>
        <table className="w-full min-w-[56rem] text-sm">
          <caption className="sr-only">Monthly funnel</caption>
          <thead className="border-b border-line font-mono text-[0.6875rem] tracking-[0.07em] text-ink-muted uppercase">
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
                <th scope="row" className={`${td} font-mono font-medium whitespace-nowrap`}>{row.month}</th>
                {COLUMNS.map(([key]) => (
                  <td key={key} className={`${td} font-mono`}>{row[key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
