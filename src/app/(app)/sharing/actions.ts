"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { findProfile } from "@/server/account";
import { inviteCollaborator, leaveSharedAccount, removeCollaborator, revokeInvite } from "@/server/sharing/commands";
import { requireUser } from "@/server/session";

export type InviteFormState = { status: "idle" | "invalid" | "sent"; message?: string };

const emailSchema = z.email("Enter a valid email address.").max(254);

export async function inviteAction(_prev: InviteFormState, formData: FormData): Promise<InviteFormState> {
  const user = await requireUser();
  const email = emailSchema.safeParse(String(formData.get("email") ?? "").trim());
  if (!email.success) return { status: "invalid", message: email.error.issues[0].message };
  const profile = await findProfile(user.id);
  const result = await inviteCollaborator({ id: user.id, email: user.email, firstName: profile.firstName }, email.data);
  if (!result.ok) return { status: "invalid", message: result.message };
  revalidatePath("/sharing");
  return { status: "sent", message: `Invite sent to ${email.data.toLowerCase()}. It expires in 7 days.` };
}

export async function revokeInviteAction(inviteId: string) {
  const user = await requireUser();
  await revokeInvite(user.id, inviteId);
  revalidatePath("/sharing");
}

export async function removeCollaboratorAction(memberId: string) {
  const user = await requireUser();
  await removeCollaborator(user.id, memberId);
  revalidatePath("/sharing");
}

export async function leaveSharedAccountAction(ownerId: string) {
  const user = await requireUser();
  await leaveSharedAccount(user.id, ownerId);
  revalidatePath("/", "layout");
}
