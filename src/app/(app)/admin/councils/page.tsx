import type { Metadata } from "next";
import { recordAdminView } from "@/server/admin/commands";
import { listCouncils } from "@/server/councils/queries";
import { requireAdmin } from "@/server/session";
import { updateCouncilAction } from "../actions";
import { AdminNav } from "../admin-nav";
import { CouncilForm } from "./council-form";

export const metadata: Metadata = { title: "Admin · Councils" };

export default async function AdminCouncilsPage() {
  const admin = await requireAdmin();
  await recordAdminView(admin.id, "councils");
  const councils = await listCouncils();
  const verified = councils.filter((council) => council.verifiedAt).length;

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold text-deep">Councils</h1>
      <AdminNav current="/admin/councils" />
      <p className="text-sm text-ink-muted">
        {councils.length} councils · {verified} verified. Saving a council with a source URL marks it verified today;
        clearing the source URL marks it unverified. Only enter details you have checked against the council&apos;s
        official page.
      </p>
      <div className="space-y-3">
        {councils.map((council) => (
          <details key={council.id} className="rounded-lg border border-line bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span className="font-display text-lg font-bold">{council.name}</span>
              <span className="text-sm text-ink-muted">
                {council.verifiedAt ? `Verified ${council.verifiedAt.toLocaleDateString("en-AU")}` : "Not yet verified"}
              </span>
            </summary>
            <div className="border-t border-line p-5">
              <CouncilForm council={council} action={updateCouncilAction.bind(null, council.id)} />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
