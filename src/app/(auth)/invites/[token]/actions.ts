"use server";

import { redirect } from "next/navigation";
import { acceptInvite } from "@/server/sharing/commands";
import { requireUser } from "@/server/session";

export async function acceptInviteAction(token: string) {
  const user = await requireUser();
  const result = await acceptInvite(user, token);
  if (!result.ok) redirect(`/invites/${encodeURIComponent(token)}?result=${result.reason}`);
  redirect("/dashboard?shared=1");
}
