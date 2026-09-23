import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { recordAdminView } from "@/server/admin/commands";
import { listRequirementsForAdmin } from "@/server/admin/queries";
import { requireAdmin } from "@/server/session";
import { markVerifiedAction, updateRequirementAction } from "../actions";
import { AdminNav } from "../admin-nav";
import { RequirementForm } from "./requirement-form";

export const metadata: Metadata = { title: "Admin · Requirements" };

export default async function AdminRequirementsPage({ searchParams }: PageProps<"/admin/requirements">) {
  const admin = await requireAdmin();
  const query = await searchParams;
  await recordAdminView(admin.id, "requirements");
  const requirements = await listRequirementsForAdmin();

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Compliance requirements</h1>
      <AdminNav current="/admin/requirements" />
      <p className="text-sm text-ink-muted">
        Changing an interval affects next due dates for new completions only. Mark a requirement verified only after
        checking it against current official sources.
      </p>
      {query.verified === "1" && <Alert tone="success">Marked as verified today.</Alert>}
      <ul className="grid gap-4 md:grid-cols-2">
        {requirements.map((requirement) => (
          <li key={requirement.id} className="space-y-3 rounded-lg border border-line bg-surface p-5">
            <h2 className="font-semibold">
              {requirement.jurisdiction} · {requirement.code}
            </h2>
            <p className="text-sm">
              {requirement.lastVerifiedAt ? `Verified ${requirement.lastVerifiedAt.toLocaleDateString("en-AU")}` : "Not yet verified"}
            </p>
            <RequirementForm requirement={requirement} action={updateRequirementAction.bind(null, requirement.id)} />
            <form action={markVerifiedAction.bind(null, requirement.id)}>
              <Button type="submit" variant="secondary">
                Mark {requirement.jurisdiction} {requirement.name} verified today
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
