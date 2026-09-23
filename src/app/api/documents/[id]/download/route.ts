import { auth } from "@/server/auth";
import { findDocumentForUser } from "@/server/vault/queries";
import { getStorage } from "@/server/vault/storage";

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });

// Authorised download. Missing, someone else's and infected documents all return the same 404.
export async function GET(request: Request, ctx: RouteContext<"/api/documents/[id]/download">) {
  const { id } = await ctx.params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user.emailVerified) return notFound();

  const document = await findDocumentForUser(session.user.id, id);
  if (!document || document.scanStatus === "INFECTED") return notFound();

  return getStorage().download(document.storageKey, document.filename, document.contentType);
}
