import type { Metadata } from "next";
import { recordAdminView } from "@/server/admin/commands";
import { listUsers } from "@/server/admin/queries";
import { requireAdmin } from "@/server/session";
import { AdminNav, Pager, pageParam, tableWrap, td, th } from "../admin-nav";

export const metadata: Metadata = { title: "Admin · Users" };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const admin = await requireAdmin();
  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q : "";
  const page = pageParam(query.page);
  await recordAdminView(admin.id, "users");
  const { users, pageCount } = await listUsers({ search, pageNumber: page });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Users</h1>
      <AdminNav current="/admin/users" />
      <form className="flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">Search by email</label>
        <input id="q" name="q" defaultValue={search} placeholder="Search by email" className="w-full max-w-sm rounded-md border border-line bg-surface px-3 py-2" />
        <button type="submit" className="rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium">Search</button>
      </form>
      <div className={tableWrap}>
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="border-b border-line bg-canvas text-ink-muted">
            <tr>
              <th scope="col" className={th}>Email</th>
              <th scope="col" className={th}>Signed up</th>
              <th scope="col" className={th}>Verified</th>
              <th scope="col" className={th}>Plan</th>
              <th scope="col" className={th}>Active properties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((user) => {
              const subscription = user.billingAccount?.subscriptions[0];
              return (
                <tr key={user.id}>
                  <td className={td}>{user.email}{user.role === "ADMIN" ? " (admin)" : ""}</td>
                  <td className={td}>{user.createdAt.toLocaleDateString("en-AU")}</td>
                  <td className={td}>{user.emailVerified ? "Yes" : "No"}</td>
                  <td className={td}>
                    {subscription ? `${subscription.plan} (${subscription.status})` : user.trialEndsAt > new Date() ? "Trial" : "Trial ended"}
                  </td>
                  <td className={td}>{user._count.properties}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pager base={search ? `/admin/users?q=${encodeURIComponent(search)}` : "/admin/users"} page={page} pageCount={pageCount} />
    </section>
  );
}
