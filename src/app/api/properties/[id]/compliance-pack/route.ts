import { CompliancePackGenerator } from "@/server/compliance-pack/generator";
import { loadCompliancePack, recordPackGenerated } from "@/server/compliance-pack/load";
import { auth } from "@/server/auth";
import { attachmentDisposition } from "@/server/vault/file-type";

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });

// Owner-only PDF download. Missing and someone else's properties return the same 404.
export async function GET(request: Request, ctx: RouteContext<"/api/properties/[id]/compliance-pack">) {
  const { id } = await ctx.params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user.emailVerified) return notFound();

  const data = await loadCompliancePack(session.user.id, id, session.user.timezone ?? "Australia/Melbourne");
  if (!data) return notFound();

  const pdf = await new CompliancePackGenerator(data).generate();
  await recordPackGenerated(session.user.id, data.property.id);

  const filename = `RentCert compliance pack - ${data.property.street} - ${data.generatedOnIso}.pdf`.replace(/[\\/:*?"<>|]/g, "");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": attachmentDisposition(filename),
      "Content-Length": String(pdf.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
