"use server";

import { redirect } from "next/navigation";
import { openBillingPortal, startCheckout } from "@/server/billing/checkout";
import { requireUser } from "@/server/session";

export async function checkoutAction(plan: "PROPERTY" | "PORTFOLIO") {
  const user = await requireUser();
  let url: string;
  try {
    url = await startCheckout(user.id, plan);
  } catch (error) {
    console.error("[billing] checkout failed", error instanceof Error ? error.name : "unknown");
    redirect("/billing?error=checkout");
  }
  redirect(url);
}

export async function portalAction() {
  const user = await requireUser();
  let url: string | null;
  try {
    url = await openBillingPortal(user.id);
  } catch (error) {
    console.error("[billing] portal failed", error instanceof Error ? error.name : "unknown");
    redirect("/billing?error=portal");
  }
  redirect(url ?? "/billing");
}
