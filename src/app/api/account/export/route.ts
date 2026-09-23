import { auth } from "@/server/auth";
import { exportAccountData } from "@/server/account-export";

// The signed-in user's own data, as a ZIP download.
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user.emailVerified) return new Response("Not found", { status: 404 });

  const stream = await exportAccountData(session.user.id);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="rentcert-export-${date}.zip"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
