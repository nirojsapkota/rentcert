import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/server/auth";

// Data access layer entry point. Pages, server actions and route handlers call these
// instead of checking auth in layouts (layouts do not re-run on navigation).

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export const requireUser = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (!session.user.emailVerified) redirect("/verify-email");
  return session.user;
});

export type CurrentUser = Awaited<ReturnType<typeof requireUser>>;
