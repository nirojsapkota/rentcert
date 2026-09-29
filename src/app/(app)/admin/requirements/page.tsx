import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { JURISDICTIONS } from "@/lib/jurisdictions";
import { basisLine } from "@/lib/requirement-basis";
import { recordAdminView } from "@/server/admin/commands";
import { listRequirementsForAdmin } from "@/server/admin/queries";
import { requireAdmin } from "@/server/session";
import { markVerifiedAction, updateRequirementAction } from "../actions";
import { AdminNav } from "../admin-nav";
import { NewRequirementForm } from "./new-requirement-form";
import { RequirementForm } from "./requirement-form";

export const metadata: Metadata = { title: "Admin · Requirements" };

export default async function AdminRequirementsPage({ searchParams }: PageProps<"/admin/requirements">) {
  const admin = await requireAdmin();
  const query = await searchParams;
  await recordAdminView(admin.id, "requirements");
  const requirements = await listRequirementsForAdmin();
  const openState = typeof query.state === "string" ? query.state : undefined;

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold text-deep">Compliance requirements</h1>
      <AdminNav current="/admin/requirements" />
      <p className="text-sm text-ink-muted">
        Each state uses its own active requirements; a state with none falls back to GENERIC. Changing an interval
        affects next due dates for new completions only. Mark a requirement verified only after checking it against
        current official sources.
      </p>
      {query.verified === "1" && <Alert tone="success">Marked as verified today.</Alert>}

      <div className="space-y-3">
        {JURISDICTIONS.map((jurisdiction) => {
          const rows = requirements.filter((row) => row.jurisdiction === jurisdiction);
          const active = rows.filter((row) => row.active);
          const verified = active.filter((row) => row.lastVerifiedAt).length;
          return (
            <details key={jurisdiction} open={openState === jurisdiction} className="group rounded-lg border border-line bg-surface">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                <span className="font-display text-lg font-bold">{jurisdiction}</span>
                <span className="text-sm text-ink-muted">
                  {active.length} active · {verified} verified
                </span>
              </summary>
              <ul className="grid gap-4 border-t border-line p-5 md:grid-cols-2">
                {rows.map((requirement) => (
                  <li key={requirement.id} className="space-y-3 rounded-lg border border-line p-5">
                    <h2 className="font-semibold">
                      {requirement.jurisdiction} · {requirement.code}
                    </h2>
                    <p className="text-sm text-ink-muted">{basisLine(requirement.basis, requirement.jurisdiction, requirement.recurrenceMonths)}</p>
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
                {rows.length === 0 && <li className="text-sm text-ink-muted">No requirements. This state uses GENERIC.</li>}
              </ul>
            </details>
          );
        })}
      </div>

      <section aria-labelledby="new-requirement-heading" className="rounded-lg border border-line bg-surface p-6">
        <h2 id="new-requirement-heading" className="text-xl font-bold">
          Add a requirement
        </h2>
        <p className="mt-1 text-sm text-ink-muted">It starts unverified and appears on that state&apos;s properties straight away.</p>
        <div className="mt-4">
          <NewRequirementForm />
        </div>
      </section>
    </section>
  );
}
