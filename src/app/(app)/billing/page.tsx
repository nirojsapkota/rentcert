import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  await requireUser();
  return <ComingSoon title="Billing" description="Plans and billing are coming soon." />;
}
