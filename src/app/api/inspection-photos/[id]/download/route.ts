import { auth } from "@/server/auth";
import { findPhotoForUser } from "@/server/barrier/inspections";
import { getStorage } from "@/server/vault/storage";

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });

// Authorised photo download for inspector accounts. Missing and someone else's photos return the same 404.
export async function GET(request: Request, ctx: RouteContext<"/api/inspection-photos/[id]/download">) {
  const { id } = await ctx.params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user.emailVerified || session.user.accountType !== "INSPECTOR") return notFound();

  const photo = await findPhotoForUser(session.user.id, id);
  if (!photo) return notFound();

  return getStorage().download(photo.storageKey, photo.filename, photo.contentType);
}
