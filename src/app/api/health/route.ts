import { checkHealth } from "@/server/ops/health";
import { reportError } from "@/server/observability";

// Database reachability plus, in production, a fresh worker heartbeat.
// Never returns connection details or error text.
export async function GET(request?: Request) {
  const scope = request && new URL(request.url).searchParams.get("scope") === "web" ? "web" : "all";
  try {
    const status = await checkHealth(new Date(), scope);
    return Response.json({ status }, { status: status === "ok" ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    reportError("health", "health check failed", error);
    return Response.json({ status: "degraded" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
