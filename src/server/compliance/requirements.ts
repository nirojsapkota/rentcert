import "server-only";
import type { ComplianceRequirement } from "@/generated/prisma/client";
import { db } from "@/server/db";

export const GENERIC_JURISDICTION = "GENERIC";

// Active requirements for a state. States without researched rules get the GENERIC schedule.
export async function requirementsFor(state: string): Promise<{
  jurisdiction: string;
  requirements: ComplianceRequirement[];
}> {
  const rows = await db.complianceRequirement.findMany({
    where: { active: true, jurisdiction: { in: [state, GENERIC_JURISDICTION] } },
    orderBy: { sortOrder: "asc" },
  });
  const specific = rows.filter((row) => row.jurisdiction === state);
  return specific.length > 0
    ? { jurisdiction: state, requirements: specific }
    : { jurisdiction: GENERIC_JURISDICTION, requirements: rows.filter((row) => row.jurisdiction === GENERIC_JURISDICTION) };
}
