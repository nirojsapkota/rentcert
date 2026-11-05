"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { poolSchema, type PoolField } from "@/lib/barrier-validation";
import { archivePool, createPool, restorePool, updatePool } from "@/server/barrier/commands";
import { councilExists } from "@/server/councils/queries";
import { requireInspector } from "@/server/session";

const FIELDS: PoolField[] = ["clientId", "kind", "addressLine1", "addressLine2", "suburb", "postcode", "councilId", "notes"];

export type PoolFormState = {
  status: "idle" | "invalid";
  fieldErrors?: Partial<Record<PoolField, string>>;
  values?: Partial<Record<PoolField, string>>;
};

async function parse(formData: FormData) {
  const values = Object.fromEntries(FIELDS.map((field) => [field, String(formData.get(field) ?? "")])) as Record<PoolField, string>;
  const result = poolSchema.safeParse(values);
  if (result.success) {
    if (result.data.councilId && !(await councilExists(result.data.councilId))) {
      return { ok: false as const, state: { status: "invalid" as const, fieldErrors: { councilId: "Choose a council from the list." }, values } };
    }
    return { ok: true as const, data: result.data };
  }
  const fieldErrors: PoolFormState["fieldErrors"] = {};
  for (const issue of result.error.issues) fieldErrors[issue.path[0] as PoolField] ??= issue.message;
  return { ok: false as const, state: { status: "invalid" as const, fieldErrors, values } };
}

export async function createPoolAction(_prev: PoolFormState, formData: FormData): Promise<PoolFormState> {
  const user = await requireInspector();
  const parsed = await parse(formData);
  if (!parsed.ok) return parsed.state;
  const pool = await createPool(user.id, parsed.data);
  // The client is missing, someone else's, or archived.
  if (!pool) return { status: "invalid", fieldErrors: { clientId: "Choose one of your active clients." }, values: Object.fromEntries(FIELDS.map((field) => [field, String(formData.get(field) ?? "")])) };
  revalidatePath("/", "layout");
  redirect(`/pools/${pool.id}?created=1`);
}

export async function updatePoolAction(poolId: string, _prev: PoolFormState, formData: FormData): Promise<PoolFormState> {
  const user = await requireInspector();
  const parsed = await parse(formData);
  if (!parsed.ok) return parsed.state;
  const pool = await updatePool(user.id, poolId, parsed.data);
  if (!pool) notFound();
  revalidatePath("/", "layout");
  redirect(`/pools/${pool.id}?saved=1`);
}

export async function archivePoolAction(poolId: string) {
  const user = await requireInspector();
  if (!(await archivePool(user.id, poolId))) notFound();
  revalidatePath("/", "layout");
  redirect(`/pools/${poolId}`);
}

export async function restorePoolAction(poolId: string) {
  const user = await requireInspector();
  const result = await restorePool(user.id, poolId);
  if (result === "client_archived") redirect(`/pools/${poolId}?restore=client_archived`);
  if (!result) notFound();
  revalidatePath("/", "layout");
  redirect(`/pools/${poolId}`);
}
