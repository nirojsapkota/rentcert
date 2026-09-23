import type { Metadata } from "next";
import { recordAdminView } from "@/server/admin/commands";
import { listPropertiesForAdmin } from "@/server/admin/queries";
import { requireAdmin } from "@/server/session";
import { AdminNav, Pager, pageParam, tableWrap, td, th } from "../admin-nav";

export const metadata: Metadata = { title: "Admin · Properties" };

export default async function AdminPropertiesPage({ searchParams }: PageProps<"/admin/properties">) {
  const admin = await requireAdmin();
  const page = pageParam((await searchParams).page);
  await recordAdminView(admin.id, "properties");
  const { properties, pageCount } = await listPropertiesForAdmin(page);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Properties</h1>
      <AdminNav current="/admin/properties" />
      <div className={tableWrap}>
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b border-line bg-canvas text-ink-muted">
            <tr>
              <th scope="col" className={th}>Locality</th>
              <th scope="col" className={th}>Owner</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={th}>Records</th>
              <th scope="col" className={th}>Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {properties.map((property) => (
              <tr key={property.id}>
                <td className={td}>{property.suburb} {property.state} {property.postcode}</td>
                <td className={td}>{property.user.email}</td>
                <td className={td}>{property.archivedAt ? "Archived" : "Active"}</td>
                <td className={td}>{property._count.complianceRecords}</td>
                <td className={td}>{property.createdAt.toLocaleDateString("en-AU")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager base="/admin/properties" page={page} pageCount={pageCount} />
    </section>
  );
}
