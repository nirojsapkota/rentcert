import { db } from "@/server/db";

// Liveness plus database reachability. Never return connection details or error text.
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch (error) {
    console.error("[health] database check failed", error instanceof Error ? error.name : "unknown");
    return Response.json({ status: "error" }, { status: 503 });
  }
}
