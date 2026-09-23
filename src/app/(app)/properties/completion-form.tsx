"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { CompletionField } from "@/lib/compliance-validation";
import type { CompletionFormState } from "./compliance-actions";
import { DOCUMENT_ACCEPT } from "./upload-form";

type Props = {
  action: (state: CompletionFormState, formData: FormData) => Promise<CompletionFormState>;
  initialValues: Partial<Record<CompletionField, string>>;
  today: string;
  submitLabel: string;
  cancelHref: string;
  allowUpload?: boolean;
};

export function CompletionForm({ action, initialValues, today, submitLabel, cancelHref, allowUpload = false }: Props) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? initialValues;

  return (
    <form action={formAction} noValidate className="space-y-4" key={JSON.stringify(values)}>
      {state.status === "invalid" && (
        <Alert tone="error">We couldn&apos;t save this compliance record. Check the completed date and try again.</Alert>
      )}
      <Field label="Completed date" name="completedOn" type="date" max={today} defaultValue={values.completedOn ?? ""} error={errors.completedOn} />
      <Field label="Provider (optional)" name="providerName" defaultValue={values.providerName ?? ""} hint="The business or person who did the check." error={errors.providerName} />
      <Field label="Provider licence number (optional)" name="providerLicenceNumber" defaultValue={values.providerLicenceNumber ?? ""} error={errors.providerLicenceNumber} />
      <div className="space-y-1.5">
        <label htmlFor="notes" className="block text-sm font-medium">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={values.notes ?? ""}
          aria-invalid={errors.notes ? true : undefined}
          aria-describedby={errors.notes ? "notes-error" : undefined}
          className="block w-full rounded-md border border-line bg-surface px-3 py-2 text-base"
        />
        {errors.notes && (
          <p id="notes-error" className="text-sm text-danger">
            {errors.notes}
          </p>
        )}
      </div>
      {allowUpload && (
        <div className="space-y-1.5">
          <label htmlFor="document" className="block text-sm font-medium">
            Certificate or report (optional)
          </label>
          <input
            id="document"
            name="document"
            type="file"
            accept={DOCUMENT_ACCEPT}
            aria-describedby={errors.document ? "document-hint document-error" : "document-hint"}
            aria-invalid={errors.document ? true : undefined}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-surface file:px-3 file:py-2 file:text-sm file:font-medium"
          />
          <p id="document-hint" className="text-sm text-ink-muted">
            PDF, JPG or PNG, up to 10 MB.
          </p>
          {errors.document && (
            <p id="document-error" className="text-sm text-danger">
              {errors.document} Choose the file again.
            </p>
          )}
        </div>
      )}
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
