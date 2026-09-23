"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { todayIn } from "@/lib/calendar-date";
import { completionSchema, parseSetupAnswers, type CompletionField } from "@/lib/compliance-validation";
import {
  recordCompletion,
  setRequirementApplicable,
  setUpChecks,
  updateRecord,
} from "@/server/compliance/commands";
import { requireUser } from "@/server/session";
import { checkFile, uploadDocument } from "@/server/vault/commands";
import { readUpload } from "./document-actions";

const DEFAULT_TIMEZONE = "Australia/Melbourne";

const READ_ONLY_MESSAGE = "Your free trial has ended. Choose a plan in Billing to add compliance records.";

export type SetupFormState = { status: "idle" | "invalid"; errors?: Record<string, string>; values?: Record<string, string>; message?: string };

export async function setUpChecksAction(
  propertyId: string,
  codes: string[],
  _prev: SetupFormState,
  formData: FormData,
): Promise<SetupFormState> {
  const user = await requireUser();
  const today = todayIn(user.timezone ?? DEFAULT_TIMEZONE);
  const read = (name: string) => String(formData.get(name) ?? "");
  const parsed = parseSetupAnswers(codes, read, today);
  if (!parsed.ok) {
    const values = Object.fromEntries(codes.flatMap((code) => [[`choice_${code}`, read(`choice_${code}`)], [`date_${code}`, read(`date_${code}`)]]));
    return { status: "invalid", errors: parsed.errors, values };
  }

  const result = await setUpChecks(user.id, propertyId, today, parsed.answers);
  if (!result.ok && result.reason === "read_only") return { status: "invalid", message: READ_ONLY_MESSAGE };
  if (!result.ok) notFound();
  revalidatePath("/", "layout");
  redirect(`/properties/${propertyId}?setup=1`);
}

export type CompletionFormState = {
  status: "idle" | "invalid";
  message?: string;
  fieldErrors?: Partial<Record<CompletionField | "document", string>>;
  values?: Partial<Record<CompletionField, string>>;
};

function parseCompletion(formData: FormData, timezone: string) {
  const values = {
    completedOn: String(formData.get("completedOn") ?? ""),
    providerName: String(formData.get("providerName") ?? ""),
    providerLicenceNumber: String(formData.get("providerLicenceNumber") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
  const result = completionSchema(todayIn(timezone)).safeParse(values);
  if (result.success) return { ok: true as const, data: result.data };
  const fieldErrors: CompletionFormState["fieldErrors"] = {};
  for (const issue of result.error.issues) fieldErrors[issue.path[0] as CompletionField] ??= issue.message;
  return { ok: false as const, state: { status: "invalid" as const, fieldErrors, values } };
}

export async function recordCompletionAction(
  propertyId: string,
  code: string,
  _prev: CompletionFormState,
  formData: FormData,
): Promise<CompletionFormState> {
  const user = await requireUser();
  const parsed = parseCompletion(formData, user.timezone ?? DEFAULT_TIMEZONE);
  const file = await readUpload(formData, "document");
  // Check the file before saving anything, so a bad file never leaves a record without it.
  const fileCheck = file ? checkFile(file) : null;
  if (!parsed.ok || (fileCheck && !fileCheck.ok)) {
    const state: CompletionFormState = parsed.ok
      ? { status: "invalid", values: Object.fromEntries(["completedOn", "providerName", "providerLicenceNumber", "notes"].map((key) => [key, String(formData.get(key) ?? "")])) }
      : parsed.state;
    if (fileCheck && !fileCheck.ok) state.fieldErrors = { ...state.fieldErrors, document: fileCheck.message };
    return state;
  }

  const result = await recordCompletion(user.id, propertyId, code, parsed.data);
  if (!result.ok && result.reason === "read_only") return { status: "invalid", message: READ_ONLY_MESSAGE };
  if (!result.ok) notFound();
  let uploadFailed = false;
  if (file) {
    const upload = await uploadDocument(user.id, propertyId, result.recordId, file);
    uploadFailed = !upload.ok;
  }
  revalidatePath("/", "layout");
  redirect(`/properties/${propertyId}?completed=${encodeURIComponent(code)}${uploadFailed ? "&uploadFailed=1" : ""}`);
}

export async function updateRecordAction(
  propertyId: string,
  recordId: string,
  _prev: CompletionFormState,
  formData: FormData,
): Promise<CompletionFormState> {
  const user = await requireUser();
  const parsed = parseCompletion(formData, user.timezone ?? DEFAULT_TIMEZONE);
  if (!parsed.ok) return parsed.state;

  const result = await updateRecord(user.id, propertyId, recordId, parsed.data);
  if (!result.ok) notFound();
  revalidatePath("/", "layout");
  redirect(`/properties/${propertyId}?recordSaved=1`);
}

export async function setApplicableAction(propertyId: string, code: string, applicable: boolean) {
  const user = await requireUser();
  const result = await setRequirementApplicable(user.id, propertyId, code, applicable);
  if (!result.ok) notFound();
  revalidatePath("/", "layout");
  redirect(`/properties/${propertyId}`);
}
