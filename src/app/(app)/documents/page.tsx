import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  await requireUser();
  return <ComingSoon title="Documents" description="The certificate vault is coming soon." />;
}
