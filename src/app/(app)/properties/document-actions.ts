"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { deleteDocument, uploadDocument } from "@/server/vault/commands";
import { requireUser } from "@/server/session";

export type UploadFormState = { status: "idle" | "invalid"; message?: string };

// Reads an optional file field. Browsers send an empty File when nothing was chosen.
export async function readUpload(formData: FormData, field: string) {
  const value = formData.get(field);
  if (!(value instanceof File) || value.size === 0) return null;
  return { name: value.name, bytes: new Uint8Array(await value.arrayBuffer()) };
}

export async function uploadDocumentAction(
  propertyId: string,
  recordId: string,
  _prev: UploadFormState,
  formData: FormData,
): Promise<UploadFormState> {
  const user = await requireUser();
  const file = await readUpload(formData, "document");
  if (!file) return { status: "invalid", message: "Choose a file to upload." };

  const result = await uploadDocument(user.id, propertyId, recordId, file);
  if (!result.ok && result.reason === "not_found") notFound();
  if (!result.ok) return { status: "invalid", message: result.message };

  revalidatePath("/", "layout");
  redirect(`/properties/${propertyId}/records/${recordId}/documents?uploaded=1`);
}

export async function deleteDocumentAction(documentId: string, returnTo: "record" | "documents") {
  const user = await requireUser();
  const result = await deleteDocument(user.id, documentId);
  if (!result.ok) notFound();

  revalidatePath("/", "layout");
  redirect(
    returnTo === "documents"
      ? "/documents?deleted=1"
      : `/properties/${result.propertyId}/records/${result.recordId}/documents?deleted=1`,
  );
}
