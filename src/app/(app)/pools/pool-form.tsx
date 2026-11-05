"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { POOL_KINDS, type PoolField } from "@/lib/barrier-validation";
import { AddressAutocomplete } from "../properties/address-autocomplete";
import type { PoolFormState } from "./actions";

type Props = {
  action: (state: PoolFormState, formData: FormData) => Promise<PoolFormState>;
  initialValues: Partial<Record<PoolField, string>>;
  clients: { id: string; name: string }[];
  councils: { id: string; name: string }[];
  submitLabel: string;
  cancelHref: string;
  addressLookup?: boolean;
};

const SELECT = "block w-full rounded-md border border-line bg-surface px-3 py-2 text-base aria-invalid:border-danger";

export function PoolForm({ action, initialValues, clients, councils, submitLabel, cancelHref, addressLookup = false }: Props) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? initialValues;
  const value = (field: PoolField) => values[field] ?? "";

  return (
    <form action={formAction} noValidate className="space-y-5" key={JSON.stringify(values)}>
      {state.status === "invalid" && <Alert tone="error">We couldn&apos;t save this pool. Check the highlighted fields and try again.</Alert>}
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <div className="space-y-1.5">
          <label htmlFor="clientId" className="block text-sm font-medium">
            Client
          </label>
          <select id="clientId" name="clientId" defaultValue={value("clientId")} aria-invalid={errors.clientId ? true : undefined} className={SELECT}>
            <option value="">Choose…</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          {errors.clientId && <p className="text-sm text-danger">{errors.clientId}</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="kind" className="block text-sm font-medium">
            Type
          </label>
          <select id="kind" name="kind" defaultValue={value("kind") || "POOL"} aria-invalid={errors.kind ? true : undefined} className={SELECT}>
            {POOL_KINDS.map((kind) => (
              <option key={kind.code} value={kind.code}>
                {kind.name}
              </option>
            ))}
          </select>
          {errors.kind && <p className="text-sm text-danger">{errors.kind}</p>}
        </div>
      </div>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold">Address (Victoria)</legend>
        {addressLookup ? (
          <AddressAutocomplete defaultValue={value("addressLine1")} error={errors.addressLine1} />
        ) : (
          <Field label="Street address" name="addressLine1" autoComplete="address-line1" defaultValue={value("addressLine1")} error={errors.addressLine1} />
        )}
        <Field label="Address line 2 (optional)" name="addressLine2" autoComplete="address-line2" defaultValue={value("addressLine2")} error={errors.addressLine2} />
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="Suburb" name="suburb" autoComplete="address-level2" defaultValue={value("suburb")} error={errors.suburb} />
          <Field label="Postcode" name="postcode" inputMode="numeric" autoComplete="postal-code" maxLength={4} defaultValue={value("postcode")} error={errors.postcode} />
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="councilId" className="block text-sm font-medium">
          Council (optional)
        </label>
        <select id="councilId" name="councilId" defaultValue={value("councilId")} aria-invalid={errors.councilId ? true : undefined} className={SELECT}>
          <option value="">Not set</option>
          {councils.map((council) => (
            <option key={council.id} value={council.id}>
              {council.name}
            </option>
          ))}
        </select>
        {errors.councilId && <p className="text-sm text-danger">{errors.councilId}</p>}
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
