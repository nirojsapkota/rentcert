"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { useHydrated } from "@/lib/use-hydrated";

export function DeleteAccountForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);
  const hydrated = useHydrated();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    const form = new FormData(event.currentTarget);
    if (form.get("confirmation") !== "DELETE") {
      setFormError('Type DELETE in capitals to confirm.');
      return;
    }

    setPending(true);
    const { error } = await authClient.deleteUser({ password: String(form.get("password") ?? "") });
    setPending(false);

    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    router.push("/sign-in?deleted=1");
    router.refresh();
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="space-y-4">
      {formError && <Alert tone="error">{formError}</Alert>}
      <Field label="Current password" name="password" type="password" autoComplete="current-password" required />
      <Field label='Type "DELETE" to confirm' name="confirmation" autoComplete="off" required />
      <Button type="submit" variant="danger" disabled={pending || !hydrated}>
        {pending ? "Deleting…" : "Delete my account permanently"}
      </Button>
    </form>
  );
}
