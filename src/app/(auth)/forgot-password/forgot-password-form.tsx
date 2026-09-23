"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { useHydrated } from "@/lib/use-hydrated";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);
  const hydrated = useHydrated();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();

    setPending(true);
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setPending(false);

    // Same message whether or not the account exists, so emails cannot be enumerated.
    if (error && error.status === 429) {
      setFormError(authErrorMessage(error));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return <Alert tone="success">If an account exists for that email, a reset link is on its way.</Alert>;
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="space-y-4">
      {formError && <Alert tone="error">{formError}</Alert>}
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Button type="submit" disabled={pending || !hydrated} className="w-full">
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
