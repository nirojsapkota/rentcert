"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PASSWORD_MIN_LENGTH, fullName, signUpSchema } from "@/lib/account-validation";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { useHydrated } from "@/lib/use-hydrated";

type FieldErrors = Partial<Record<"firstName" | "lastName" | "email" | "password" | "accountType", string>>;

// returnTo is an already-validated invite path (see inviteReturnPath).
export function SignUpForm({ returnTo }: { returnTo?: string }) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);
  const hydrated = useHydrated();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);

    const parsed = signUpSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        errors[key] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setPending(true);
    const { firstName, lastName, email, password, accountType } = parsed.data;
    const { error } = await authClient.signUp.email({
      email,
      password,
      firstName,
      lastName,
      accountType,
      name: fullName(firstName, lastName),
      callbackURL: returnTo ?? "/verify-email/done",
    });
    setPending(false);

    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    router.push("/verify-email?sent=1");
  }

  return (
    <form method="post" onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError && <Alert tone="error">{formError}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" name="firstName" autoComplete="given-name" required error={fieldErrors.firstName} />
        <Field label="Last name" name="lastName" autoComplete="family-name" required error={fieldErrors.lastName} />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">I am a</legend>
        <label className="flex items-center gap-2 text-base">
          <input type="radio" name="accountType" value="LANDLORD" defaultChecked /> Landlord or property manager
        </label>
        <label className="flex items-center gap-2 text-base">
          <input type="radio" name="accountType" value="INSPECTOR" /> Pool or spa barrier inspector
        </label>
        {fieldErrors.accountType && <p className="text-sm text-danger">{fieldErrors.accountType}</p>}
      </fieldset>
      <Field label="Email" name="email" type="email" autoComplete="email" required error={fieldErrors.email} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        error={fieldErrors.password}
      />
      <Button type="submit" disabled={pending || !hydrated} className="w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
