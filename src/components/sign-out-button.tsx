"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({ className = "text-brand" }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <button type="button" onClick={signOut} disabled={pending} className={`text-sm font-medium hover:underline ${className}`}>
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
