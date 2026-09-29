"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { JURISDICTIONS } from "@/lib/jurisdictions";
import { createRequirementAction, type AdminFormState } from "../actions";
import { BasisSelect } from "./requirement-form";

export function NewRequirementForm() {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(createRequirementAction, { status: "idle" });
  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      {state.status === "saved" && (
        <div className="md:col-span-2">
          <Alert tone="success">{state.message}</Alert>
        </div>
      )}
      {state.status === "invalid" && (
        <div className="md:col-span-2">
          <Alert tone="error">{state.message}</Alert>
        </div>
      )}
      <div className="space-y-1.5">
        <label htmlFor="new-jurisdiction" className="block text-sm font-medium">
          State
        </label>
        <select id="new-jurisdiction" name="jurisdiction" className="block w-full rounded-md border border-line bg-surface px-3 py-2 text-base">
          {JURISDICTIONS.map((jurisdiction) => (
            <option key={jurisdiction} value={jurisdiction}>
              {jurisdiction}
            </option>
          ))}
        </select>
      </div>
      <Field id="new-code" label="Code" name="code" hint="For example pool_barrier. Reuse electrical, gas or smoke_alarm to keep history." />
      <Field id="new-name" label="Name" name="name" />
      <Field id="new-months" label="Interval (months)" name="recurrenceMonths" type="number" min={1} max={120} defaultValue={12} />
      <div className="md:col-span-2">
        <Field id="new-description" label="Description" name="description" />
      </div>
      <BasisSelect id="new-basis" />
      <Field id="new-sourceName" label="Source name" name="sourceName" />
      <div className="md:col-span-2">
        <Field id="new-sourceUrl" label="Source URL" name="sourceUrl" type="url" hint="Official https:// page. Leave empty if there is none." />
      </div>
      <input type="hidden" name="active" value="on" />
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add requirement"}
        </Button>
      </div>
    </form>
  );
}
