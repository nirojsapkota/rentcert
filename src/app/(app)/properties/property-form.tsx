"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { AUSTRALIAN_STATES, type PropertyField } from "@/lib/property-validation";
import type { PropertyFormState } from "./actions";

type Props = {
  action: (state: PropertyFormState, formData: FormData) => Promise<PropertyFormState>;
  initialValues: Partial<Record<PropertyField, string>>;
  submitLabel: string;
  cancelHref: string;
};

export function PropertyForm({ action, initialValues, submitLabel, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const errors = state.fieldErrors ?? {};
  // React resets the form after each submission, so re-fill it from the submitted values.
  const values = state.values ?? initialValues;
  const value = (field: PropertyField) => values[field] ?? "";

  return (
    <form action={formAction} noValidate className="space-y-5" key={JSON.stringify(values)}>
      {state.status === "invalid" && (
        <Alert tone="error">We couldn&apos;t save this property. Check the highlighted fields and try again.</Alert>
      )}

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold">Address</legend>
        <Field label="Street address" name="addressLine1" autoComplete="address-line1" defaultValue={value("addressLine1")} error={errors.addressLine1} />
        <Field label="Address line 2 (optional)" name="addressLine2" autoComplete="address-line2" defaultValue={value("addressLine2")} error={errors.addressLine2} />
        <div className="grid gap-4 sm:grid-cols-[2fr_1.5fr_1fr]">
          <Field label="Suburb" name="suburb" autoComplete="address-level2" defaultValue={value("suburb")} error={errors.suburb} />
          <div className="space-y-1.5">
            <label htmlFor="state" className="block text-sm font-medium">
              State or territory
            </label>
            <select
              id="state"
              name="state"
              defaultValue={value("state")}
              aria-invalid={errors.state ? true : undefined}
              aria-describedby={errors.state ? "state-error" : undefined}
              className="block w-full rounded-md border border-line bg-surface px-3 py-2 text-base aria-invalid:border-danger"
            >
              <option value="">Choose…</option>
              {AUSTRALIAN_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name} ({state.code})
                </option>
              ))}
            </select>
            {errors.state && (
              <p id="state-error" className="text-sm text-danger">
                {errors.state}
              </p>
            )}
          </div>
          <Field label="Postcode" name="postcode" inputMode="numeric" autoComplete="postal-code" maxLength={4} defaultValue={value("postcode")} error={errors.postcode} />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold">Details</legend>
        <Field
          label="Nickname (optional)"
          name="nickname"
          defaultValue={value("nickname")}
          hint="A short name you'll recognise, for example “Smith St unit”."
          error={errors.nickname}
        />
        <Field
          label="Lease start date (optional)"
          name="leaseStartDate"
          type="date"
          defaultValue={value("leaseStartDate")}
          hint="The start date of the current lease, if there is one."
          error={errors.leaseStartDate}
        />
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
            aria-describedby={errors.notes ? "notes-error" : undefined}
            className="block w-full rounded-md border border-line bg-surface px-3 py-2 text-base aria-invalid:border-danger"
          />
          {errors.notes && (
            <p id="notes-error" className="text-sm text-danger">
              {errors.notes}
            </p>
          )}
        </div>
      </fieldset>

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
