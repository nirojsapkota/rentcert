import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Properties" };

export default async function PropertiesPage() {
  await requireUser();
  return <ComingSoon title="Properties" description="Property management is coming soon." />;
}
