"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { inviteAction, type InviteFormState } from "./actions";

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteFormState, FormData>(inviteAction, { status: "idle" });
  return (
    <form action={action} noValidate className="max-w-md space-y-3">
      {state.status === "sent" && <Alert tone="success">{state.message}</Alert>}
      {state.status === "invalid" && <Alert tone="error">{state.message}</Alert>}
      <Field
        key={state.status === "sent" ? state.message : "email"}
        label="Email address"
        name="email"
        type="email"
        autoComplete="off"
        required
        hint="They'll see and manage all your properties. They won't see your billing."
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send invite"}
      </Button>
    </form>
  );
}
