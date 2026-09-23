"use server";
import { reportError } from "@/server/observability";

import { redirect } from "next/navigation";
import { openBillingPortal, startCheckout } from "@/server/billing/checkout";
import { requireUser } from "@/server/session";

export async function checkoutAction(plan: "PROPERTY" | "PORTFOLIO") {
  const user = await requireUser();
  let url: string;
  try {
    url = await startCheckout(user.id, plan);
  } catch (error) {
    reportError("billing", "checkout failed", error);
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
    reportError("billing", "portal failed", error);
    redirect("/billing?error=portal");
  }
  redirect(url ?? "/billing");
}
