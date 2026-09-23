"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <button type="button" onClick={signOut} disabled={pending} className="text-sm font-medium text-brand hover:underline">
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
