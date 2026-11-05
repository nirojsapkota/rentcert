"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { ClientField } from "@/lib/barrier-validation";
import type { ClientFormState } from "./actions";

type Props = {
  action: (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  initialValues: Partial<Record<ClientField, string>>;
  submitLabel: string;
  cancelHref: string;
};

export function ClientForm({ action, initialValues, submitLabel, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? initialValues;
  const value = (field: ClientField) => values[field] ?? "";

  return (
    <form action={formAction} noValidate className="space-y-5" key={JSON.stringify(values)}>
      {state.status === "invalid" && <Alert tone="error">We couldn&apos;t save this client. Check the highlighted fields and try again.</Alert>}
      <Field label="Name" name="name" autoComplete="off" defaultValue={value("name")} error={errors.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email (optional)" name="email" type="email" autoComplete="off" defaultValue={value("email")} error={errors.email} />
        <Field label="Phone (optional)" name="phone" type="tel" autoComplete="off" defaultValue={value("phone")} error={errors.phone} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="notes" className="block text-sm font-medium">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={value("notes")}
          aria-invalid={errors.notes ? true : undefined}
          className="block w-full rounded-md border border-line bg-surface px-3 py-2 text-base aria-invalid:border-danger"
        />
        {errors.notes && <p className="text-sm text-danger">{errors.notes}</p>}
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Link href={cancelHref} className={buttonClasses("secondary")}>
          Cancel
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
