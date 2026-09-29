import { auth } from "@/server/auth";
import { allowSearch, addressLookupEnabled, searchAddresses } from "@/server/address/search";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

// Address suggestions for the property form. Signed-in, verified users only, rate limited per user.
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user.emailVerified) return json({ error: "not_found" }, 404);
  if (!addressLookupEnabled()) return json({ error: "not_found" }, 404);
  if (!allowSearch(session.user.id)) return json({ error: "rate_limited" }, 429);

  const query = new URL(request.url).searchParams.get("q") ?? "";
  return json({ suggestions: await searchAddresses(query) });
}
