"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { BASIS_OPTIONS, type RequirementBasis } from "@/lib/requirement-basis";
import type { AdminFormState } from "../actions";

export function BasisSelect({ id, defaultValue }: { id: string; defaultValue?: RequirementBasis }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        Basis
      </label>
      <select id={id} name="basis" defaultValue={defaultValue ?? "REQUIRED_INTERVAL"} className="block w-full rounded-md border border-line bg-surface px-3 py-2 text-base">
        {BASIS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type Requirement = {
  id: string;
  name: string;
  description: string;
  recurrenceMonths: number;
  basis: RequirementBasis;
  sourceName: string | null;
  sourceUrl: string | null;
  active: boolean;
};

export function RequirementForm({
  requirement,
  action,
}: {
  requirement: Requirement;
  action: (state: AdminFormState, formData: FormData) => Promise<AdminFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const id = (field: string) => `${requirement.id}-${field}`;
  return (
    <form action={formAction} className="space-y-3">
      {state.status === "saved" && <Alert tone="success">Saved.</Alert>}
      {state.status === "invalid" && <Alert tone="error">{state.message}</Alert>}
      <Field id={id("name")} label="Name" name="name" defaultValue={requirement.name} />
      <Field id={id("description")} label="Description" name="description" defaultValue={requirement.description} />
      <Field
        id={id("months")}
        label="Interval (months)"
        name="recurrenceMonths"
        type="number"
        min={1}
        max={120}
        defaultValue={requirement.recurrenceMonths}
        hint="A change applies to checks recorded from now on."
      />
      <BasisSelect id={id("basis")} defaultValue={requirement.basis} />
      <Field id={id("sourceName")} label="Source name" name="sourceName" defaultValue={requirement.sourceName ?? ""} />
      <Field id={id("sourceUrl")} label="Source URL" name="sourceUrl" type="url" defaultValue={requirement.sourceUrl ?? ""} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={requirement.active} /> Active
      </label>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : `Save ${requirement.name}`}
      </Button>
    </form>
  );
}
