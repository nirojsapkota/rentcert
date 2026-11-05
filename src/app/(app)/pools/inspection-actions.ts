"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { todayIn } from "@/lib/calendar-date";
import { inspectionSchema, photoCaptionSchema, type InspectionField } from "@/lib/inspection-validation";
import { createInspection, deleteInspectionPhoto, updateInspection, uploadInspectionPhoto } from "@/server/barrier/inspections";
import { requireInspector } from "@/server/session";

const FIELDS: InspectionField[] = ["kind", "outcome", "inspectedOn", "certificateNumber", "lodgedOn", "notes"];

export type InspectionFormState = {
  status: "idle" | "invalid";
  fieldErrors?: Partial<Record<InspectionField, string>>;
  values?: Partial<Record<InspectionField, string>>;
};

export type PhotoFormState = { status: "idle" | "invalid"; message?: string };

function parse(formData: FormData, timezone: string) {
  const values = Object.fromEntries(FIELDS.map((field) => [field, String(formData.get(field) ?? "")])) as Record<InspectionField, string>;
  const result = inspectionSchema(todayIn(timezone)).safeParse(values);
  if (result.success) return { ok: true as const, data: result.data };
  const fieldErrors: InspectionFormState["fieldErrors"] = {};
  for (const issue of result.error.issues) fieldErrors[issue.path[0] as InspectionField] ??= issue.message;
  return { ok: false as const, state: { status: "invalid" as const, fieldErrors, values } };
}

export async function createInspectionAction(poolId: string, _prev: InspectionFormState, formData: FormData): Promise<InspectionFormState> {
  const user = await requireInspector();
  const parsed = parse(formData, user.timezone ?? "Australia/Melbourne");
  if (!parsed.ok) return parsed.state;
  const inspection = await createInspection(user.id, poolId, parsed.data);
  if (!inspection) notFound();
  revalidatePath("/", "layout");
  redirect(`/pools/${poolId}/inspections/${inspection.id}?created=1`);
}

export async function updateInspectionAction(poolId: string, inspectionId: string, _prev: InspectionFormState, formData: FormData): Promise<InspectionFormState> {
  const user = await requireInspector();
  const parsed = parse(formData, user.timezone ?? "Australia/Melbourne");
  if (!parsed.ok) return parsed.state;
  const inspection = await updateInspection(user.id, inspectionId, parsed.data);
  if (!inspection || inspection.poolId !== poolId) notFound();
  revalidatePath("/", "layout");
  redirect(`/pools/${poolId}/inspections/${inspectionId}?saved=1`);
}

export async function uploadPhotoAction(poolId: string, inspectionId: string, _prev: PhotoFormState, formData: FormData): Promise<PhotoFormState> {
  const user = await requireInspector();
  const value = formData.get("photo");
  if (!(value instanceof File) || value.size === 0) return { status: "invalid", message: "Choose a photo to upload." };
  const caption = photoCaptionSchema.safeParse(String(formData.get("caption") ?? ""));
  if (!caption.success) return { status: "invalid", message: caption.error.issues[0].message };

  const result = await uploadInspectionPhoto(user.id, inspectionId, { name: value.name, bytes: new Uint8Array(await value.arrayBuffer()) }, caption.data);
  if (!result.ok && result.reason === "not_found") notFound();
  if (!result.ok) return { status: "invalid", message: result.message };
  revalidatePath("/", "layout");
  redirect(`/pools/${poolId}/inspections/${inspectionId}?uploaded=1`);
}

export async function deletePhotoAction(photoId: string) {
  const user = await requireInspector();
  const result = await deleteInspectionPhoto(user.id, photoId);
  if (!result) notFound();
  revalidatePath("/", "layout");
  redirect(`/pools/${result.poolId}/inspections/${result.inspectionId}`);
}
