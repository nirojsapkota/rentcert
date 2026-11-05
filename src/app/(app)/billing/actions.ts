"use server";
import { reportError } from "@/server/observability";

import { redirect } from "next/navigation";
import { AlreadySubscribedError, openBillingPortal, startCheckout, startPlanChange } from "@/server/billing/checkout";
import { countActiveProperties } from "@/server/properties/queries";
import { requireUser } from "@/server/session";

export async function checkoutAction(plan: "PROPERTY" | "PORTFOLIO") {
  const user = await requireUser();
  let url: string;
  try {
    url = await startCheckout(user.id, plan);
  } catch (error) {
    if (error instanceof AlreadySubscribedError) redirect("/billing");
    reportError("billing", "checkout failed", error);
    redirect("/billing?error=checkout");
  }
  redirect(url);
}

export async function changePlanAction(plan: "PROPERTY" | "PORTFOLIO") {
  const user = await requireUser();
  let target: string;
  try {
    const result = await startPlanChange(user.id, plan, await countActiveProperties(user.id));
    target = result.ok ? result.url : result.reason === "too_many_properties" ? "/billing?error=too_many_properties" : "/billing";
  } catch (error) {
    reportError("billing", "plan change failed", error);
    redirect("/billing?error=plan_change");
  }
  redirect(target);
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
