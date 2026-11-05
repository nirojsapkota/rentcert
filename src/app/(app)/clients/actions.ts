"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { clientSchema, type ClientField } from "@/lib/barrier-validation";
import { archiveClient, createClient, restoreClient, updateClient } from "@/server/barrier/commands";
import { requireInspector } from "@/server/session";

const FIELDS: ClientField[] = ["name", "email", "phone", "notes"];

export type ClientFormState = {
  status: "idle" | "invalid";
  fieldErrors?: Partial<Record<ClientField, string>>;
  values?: Partial<Record<ClientField, string>>;
};

function parse(formData: FormData) {
  const values = Object.fromEntries(FIELDS.map((field) => [field, String(formData.get(field) ?? "")])) as Record<ClientField, string>;
  const result = clientSchema.safeParse(values);
  if (result.success) return { ok: true as const, data: result.data };
  const fieldErrors: ClientFormState["fieldErrors"] = {};
  for (const issue of result.error.issues) fieldErrors[issue.path[0] as ClientField] ??= issue.message;
  return { ok: false as const, state: { status: "invalid" as const, fieldErrors, values } };
}

export async function createClientAction(_prev: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const user = await requireInspector();
  const parsed = parse(formData);
  if (!parsed.ok) return parsed.state;
  const client = await createClient(user.id, parsed.data);
  revalidatePath("/", "layout");
  redirect(`/clients/${client.id}?created=1`);
}

export async function updateClientAction(clientId: string, _prev: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const user = await requireInspector();
  const parsed = parse(formData);
  if (!parsed.ok) return parsed.state;
  const client = await updateClient(user.id, clientId, parsed.data);
  if (!client) notFound();
  revalidatePath("/", "layout");
  redirect(`/clients/${client.id}?saved=1`);
}

export async function archiveClientAction(clientId: string) {
  const user = await requireInspector();
  if (!(await archiveClient(user.id, clientId))) notFound();
  revalidatePath("/", "layout");
  redirect(`/clients/${clientId}`);
}

export async function restoreClientAction(clientId: string) {
  const user = await requireInspector();
  if (!(await restoreClient(user.id, clientId))) notFound();
  revalidatePath("/", "layout");
  redirect(`/clients/${clientId}`);
}
