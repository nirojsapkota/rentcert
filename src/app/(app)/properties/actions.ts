"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { todayIn } from "@/lib/calendar-date";
import { propertySchema, type PropertyField } from "@/lib/property-validation";
import {
  archiveProperty,
  createProperty,
  deleteProperty,
  restoreProperty,
  updateProperty,
} from "@/server/properties/commands";
import { transferProperty } from "@/server/properties/transfer";
import { requireUser } from "@/server/session";

const FIELDS: PropertyField[] = [
  "addressLine1",
  "addressLine2",
  "suburb",
  "state",
  "postcode",
  "nickname",
  "notes",
  "leaseStartDate",
];

export type PropertyFormState = {
  status: "idle" | "invalid" | "limit_reached";
  fieldErrors?: Partial<Record<PropertyField, string>>;
  // Submitted values, so the form can show them again after a validation error.
  values?: Partial<Record<PropertyField, string>>;
};

function parse(formData: FormData, timezone: string) {
  const values = Object.fromEntries(FIELDS.map((field) => [field, String(formData.get(field) ?? "")])) as Record<
    PropertyField,
    string
  >;
  const result = propertySchema(todayIn(timezone)).safeParse(values);
  if (result.success) return { ok: true as const, data: result.data };

  const fieldErrors: PropertyFormState["fieldErrors"] = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as PropertyField;
    fieldErrors[field] ??= issue.message;
  }
  return { ok: false as const, state: { status: "invalid" as const, fieldErrors, values } };
}

export async function createPropertyAction(_prev: PropertyFormState, formData: FormData): Promise<PropertyFormState> {
  const user = await requireUser();
  const parsed = parse(formData, user.timezone ?? "Australia/Melbourne");
  if (!parsed.ok) return parsed.state;

  const result = await createProperty(user.id, parsed.data);
  if (!result.ok) return { status: "limit_reached", values: Object.fromEntries(FIELDS.map((field) => [field, String(formData.get(field) ?? "")])) };
  revalidatePath("/", "layout");
  redirect(`/properties/${result.property.id}/setup`);
}

export async function updatePropertyAction(
  propertyId: string,
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const user = await requireUser();
  const parsed = parse(formData, user.timezone ?? "Australia/Melbourne");
  if (!parsed.ok) return parsed.state;

  const property = await updateProperty(user.id, propertyId, parsed.data);
  if (!property) notFound();
  revalidatePath("/properties", "layout");
  redirect(`/properties/${property.id}?saved=1`);
}

export async function archivePropertyAction(propertyId: string) {
  const user = await requireUser();
  if (!(await archiveProperty(user.id, propertyId))) notFound();
  revalidatePath("/properties", "layout");
  redirect(`/properties/${propertyId}`);
}

export async function restorePropertyAction(propertyId: string) {
  const user = await requireUser();
  const result = await restoreProperty(user.id, propertyId);
  if (result === "limit_reached") redirect(`/properties/${propertyId}?restore=limit`);
  if (!result) notFound();
  revalidatePath("/properties", "layout");
  redirect(`/properties/${propertyId}`);
}

export async function deletePropertyAction(propertyId: string) {
  const user = await requireUser();
  const result = await deleteProperty(user.id, propertyId);
  if (result === "not_found") notFound();
  if (result === "has_history") redirect(`/properties/${propertyId}?delete=blocked`);
  revalidatePath("/properties", "layout");
  redirect("/properties?deleted=1");
}

export async function transferPropertyAction(propertyId: string, formData: FormData) {
  const user = await requireUser();
  const result = await transferProperty(user.id, propertyId, String(formData.get("newOwnerId") ?? ""));
  if (result === "not_found") notFound();
  if (result === "no_slot") redirect(`/properties/${propertyId}?transfer=no_slot`);
  revalidatePath("/", "layout");
  redirect("/properties?transferred=1");
}
