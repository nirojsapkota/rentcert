import type { Metadata } from "next";
import { recordAdminView } from "@/server/admin/commands";
import { listSubscriptionsForAdmin } from "@/server/admin/queries";
import { requireAdmin } from "@/server/session";
import { AdminNav, Pager, pageParam, tableWrap, td, th } from "../admin-nav";

export const metadata: Metadata = { title: "Admin · Subscriptions" };

export default async function AdminSubscriptionsPage({ searchParams }: PageProps<"/admin/subscriptions">) {
  const admin = await requireAdmin();
  const page = pageParam((await searchParams).page);
  await recordAdminView(admin.id, "subscriptions");
  const { subscriptions, pageCount } = await listSubscriptionsForAdmin(page);

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold text-deep">Subscriptions</h1>
      <AdminNav current="/admin/subscriptions" />
      <div className={tableWrap}>
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b border-line bg-canvas text-ink-muted">
            <tr>
              <th scope="col" className={th}>Customer</th>
              <th scope="col" className={th}>Plan</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={th}>Period ends</th>
              <th scope="col" className={th}>Cancels at period end</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {subscriptions.map((subscription) => (
              <tr key={subscription.id}>
                <td className={td}>{subscription.billingAccount.user.email}</td>
                <td className={td}>{subscription.plan}</td>
                <td className={td}>{subscription.status}</td>
                <td className={td}>{subscription.currentPeriodEnd?.toLocaleDateString("en-AU") ?? "—"}</td>
                <td className={td}>{subscription.cancelAtPeriodEnd ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager base="/admin/subscriptions" page={page} pageCount={pageCount} />
    </section>
  );
}
