"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { INSPECTION_KINDS, INSPECTION_OUTCOMES, type InspectionField } from "@/lib/inspection-validation";
import type { InspectionFormState } from "./inspection-actions";

type Props = {
  action: (state: InspectionFormState, formData: FormData) => Promise<InspectionFormState>;
  initialValues: Partial<Record<InspectionField, string>>;
  submitLabel: string;
  cancelHref: string;
};

const SELECT = "block w-full rounded-md border border-line bg-surface px-3 py-2 text-base aria-invalid:border-danger";

export function InspectionForm({ action, initialValues, submitLabel, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? initialValues;
  const value = (field: InspectionField) => values[field] ?? "";

  return (
    <form action={formAction} noValidate className="space-y-5" key={JSON.stringify(values)}>
      {state.status === "invalid" && <Alert tone="error">We couldn&apos;t save this inspection. Check the highlighted fields and try again.</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="kind" className="block text-sm font-medium">
            Type
          </label>
          <select id="kind" name="kind" defaultValue={value("kind") || "PERIODIC"} aria-invalid={errors.kind ? true : undefined} className={SELECT}>
            {INSPECTION_KINDS.map((kind) => (
              <option key={kind.code} value={kind.code}>
                {kind.name}
              </option>
            ))}
          </select>
          {errors.kind && <p className="text-sm text-danger">{errors.kind}</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="outcome" className="block text-sm font-medium">
            Outcome
          </label>
          <select id="outcome" name="outcome" defaultValue={value("outcome") || "PASS"} aria-invalid={errors.outcome ? true : undefined} className={SELECT}>
            {INSPECTION_OUTCOMES.map((outcome) => (
              <option key={outcome.code} value={outcome.code}>
                {outcome.name}
              </option>
            ))}
          </select>
          {errors.outcome && <p className="text-sm text-danger">{errors.outcome}</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Inspection date" name="inspectedOn" type="date" defaultValue={value("inspectedOn")} error={errors.inspectedOn} />
        <Field label="Lodged with council on (optional)" name="lodgedOn" type="date" defaultValue={value("lodgedOn")} error={errors.lodgedOn} />
      </div>
      <Field label="Certificate number (optional)" name="certificateNumber" defaultValue={value("certificateNumber")} error={errors.certificateNumber} />
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
