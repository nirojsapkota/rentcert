"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PASSWORD_MIN_LENGTH, passwordSchema } from "@/lib/account-validation";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { useHydrated } from "@/lib/use-hydrated";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [passwordError, setPasswordError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);
  const hydrated = useHydrated();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("password") ?? "");

    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) {
      setPasswordError(parsed.error.issues[0].message);
      return;
    }
    if (newPassword !== form.get("passwordConfirmation")) {
      setPasswordError("The passwords don't match.");
      return;
    }
    setPasswordError(undefined);

    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword, token });
    setPending(false);

    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    router.push("/sign-in?reset=1");
  }

  return (
    <form method="post" onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError && <Alert tone="error">{formError}</Alert>}
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        error={passwordError}
      />
      <Field label="Confirm new password" name="passwordConfirmation" type="password" autoComplete="new-password" required />
      <Button type="submit" disabled={pending || !hydrated} className="w-full">
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
