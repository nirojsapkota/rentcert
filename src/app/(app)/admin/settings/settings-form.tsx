"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { setTrialDaysAction, type AdminFormState } from "../actions";

export function SettingsForm({ trialDays }: { trialDays: number }) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(setTrialDaysAction, { status: "idle" });
  return (
    <form action={action} noValidate className="max-w-sm space-y-3">
      {state.status === "saved" && <Alert tone="success">Saved. New sign-ups get this trial length.</Alert>}
      {state.status === "invalid" && <Alert tone="error">{state.message}</Alert>}
      <Field label="Free trial length (days)" name="trialDays" type="number" min={0} max={730} defaultValue={trialDays} hint="Applies to new sign-ups only." />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
