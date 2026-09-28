"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { useHydrated } from "@/lib/use-hydrated";

// returnTo is an already-validated invite path (see inviteReturnPath).
export function SignInForm({ returnTo }: { returnTo?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);
  const hydrated = useHydrated();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    const form = new FormData(event.currentTarget);

    setPending(true);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
      // Used by the verification email that Better Auth resends to unverified users.
      callbackURL: returnTo ?? "/verify-email/done",
    });
    setPending(false);

    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    router.push(returnTo ?? "/dashboard");
    router.refresh();
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="space-y-4">
      {formError && <Alert tone="error">{formError}</Alert>}
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <Button type="submit" disabled={pending || !hydrated} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
