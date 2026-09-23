"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { updateProfileAction, type ProfileFormState } from "./actions";

type Profile = {
  email: string;
  firstName: string;
  lastName: string;
  timezone: string;
  notificationEmail: string | null;
};

export function ProfileForm({ profile, timezones }: { profile: Profile; timezones: string[] }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(updateProfileAction, { status: "idle" });
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="space-y-4">
      {state.status === "saved" && <Alert tone="success">Your details have been saved.</Alert>}
      {state.status === "invalid" && <Alert tone="error">We couldn&apos;t save your details. Check the fields below.</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" name="firstName" autoComplete="given-name" defaultValue={profile.firstName} error={errors.firstName} />
        <Field label="Last name" name="lastName" autoComplete="family-name" defaultValue={profile.lastName} error={errors.lastName} />
      </div>
      <Field label="Sign-in email" name="email" type="email" defaultValue={profile.email} readOnly disabled />
      <Field
        label="Reminder email (optional)"
        name="notificationEmail"
        type="email"
        autoComplete="email"
        defaultValue={profile.notificationEmail ?? ""}
        hint="Reminders go here. Leave blank to use your sign-in email."
        error={errors.notificationEmail}
      />
      <div className="space-y-1.5">
        <label htmlFor="timezone" className="block text-sm font-medium">
          Timezone
        </label>
        <select
          id="timezone"
          name="timezone"
          defaultValue={profile.timezone}
          aria-describedby="timezone-hint"
          className="block w-full rounded-md border border-line bg-surface px-3 py-2 text-base"
        >
          {timezones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        <p id="timezone-hint" className="text-sm text-ink-muted">
          RentCert uses this timezone to decide what &quot;today&quot; is for due dates.
        </p>
        {errors.timezone && <p className="text-sm text-danger">{errors.timezone}</p>}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save details"}
      </Button>
    </form>
  );
}
