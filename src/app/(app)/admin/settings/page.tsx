import type { Metadata } from "next";
import { recordAdminView } from "@/server/admin/commands";
import { trialDays } from "@/server/billing/settings";
import { requireAdmin } from "@/server/session";
import { AdminNav } from "../admin-nav";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Admin · Settings" };

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();
  await recordAdminView(admin.id, "settings");
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <AdminNav current="/admin/settings" />
      <SettingsForm trialDays={await trialDays()} />
    </section>
  );
}
