"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { JURISDICTIONS } from "@/lib/jurisdictions";
import {
  createRequirement,
  markRequirementVerified,
  setTrialDays,
  setUserRole,
  updateRequirement,
} from "@/server/admin/commands";
import { requireAdmin } from "@/server/session";

const requirementSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(80),
  description: z.string().trim().min(1, "Enter a description.").max(300),
  recurrenceMonths: z.coerce.number().int().min(1, "Use 1 to 120 months.").max(120, "Use 1 to 120 months."),
  basis: z.enum(["REQUIRED_INTERVAL", "BEFORE_EACH_TENANCY", "RECOMMENDED"], "Choose a basis."),
  sourceName: z.string().trim().max(200).transform((value) => value || null),
  sourceUrl: z
    .string()
    .trim()
    .transform((value) => value || null)
    .pipe(z.url({ protocol: /^https$/, message: "Use an https:// link." }).nullable()),
  active: z.preprocess((value) => value === "on", z.boolean()),
});

export type AdminFormState = { status: "idle" | "invalid" | "saved"; message?: string };

export async function updateRequirementAction(requirementId: string, _prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const parsed = requirementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "invalid", message: parsed.error.issues[0].message };
  if (!(await updateRequirement(admin.id, requirementId, parsed.data))) notFound();
  revalidatePath("/", "layout");
  return { status: "saved" };
}

const newRequirementSchema = requirementSchema.extend({
  jurisdiction: z.enum(JURISDICTIONS, "Choose a state."),
  code: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]{1,39}$/, "Use 2 to 40 lower-case letters, digits or underscores, starting with a letter."),
});

export async function createRequirementAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const parsed = newRequirementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "invalid", message: parsed.error.issues[0].message };
  if ((await createRequirement(admin.id, parsed.data)) === "duplicate") {
    return { status: "invalid", message: `${parsed.data.jurisdiction} already has a requirement with the code ${parsed.data.code}.` };
  }
  revalidatePath("/", "layout");
  return { status: "saved", message: `Added ${parsed.data.name} to ${parsed.data.jurisdiction}.` };
}

export async function markVerifiedAction(requirementId: string) {
  const admin = await requireAdmin();
  const jurisdiction = await markRequirementVerified(admin.id, requirementId);
  if (!jurisdiction) notFound();
  revalidatePath("/", "layout");
  redirect(`/admin/requirements?verified=1&state=${jurisdiction}`);
}

export async function setTrialDaysAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const parsed = z.coerce.number().int().min(0).max(730).safeParse(formData.get("trialDays"));
  if (!parsed.success) return { status: "invalid", message: "Enter a whole number of days from 0 to 730." };
  await setTrialDays(admin.id, parsed.data);
  revalidatePath("/admin/settings");
  return { status: "saved" };
}

export async function setUserRoleAction(userId: string, formData: FormData) {
  const admin = await requireAdmin();
  const role = z.enum(["USER", "ADMIN"]).safeParse(formData.get("role"));
  if (!role.success) notFound();
  const result = await setUserRole(admin.id, userId, role.data);
  if (result === "not_found") notFound();
  revalidatePath("/admin/users");
}
