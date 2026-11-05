"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { LODGEMENT_METHODS, type LodgementMethodCode } from "@/lib/council";
import type { AdminFormState } from "../actions";

type Council = {
  id: string;
  name: string;
  lodgementMethod: LodgementMethodCode;
  contactEmail: string | null;
  contactPhone: string | null;
  portalUrl: string | null;
  sourceUrl: string | null;
  notes: string | null;
};

export function CouncilForm({ council, action }: { council: Council; action: (state: AdminFormState, formData: FormData) => Promise<AdminFormState> }) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const id = (field: string) => `${council.id}-${field}`;
  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      <div className="space-y-3 md:col-span-2">
        {state.status === "saved" && <Alert tone="success">Saved.</Alert>}
        {state.status === "invalid" && <Alert tone="error">{state.message}</Alert>}
      </div>
      <div className="space-y-1.5">
        <label htmlFor={id("method")} className="block text-sm font-medium">
          Lodgement method
        </label>
        <select id={id("method")} name="lodgementMethod" defaultValue={council.lodgementMethod} className="block w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-base">
          {LODGEMENT_METHODS.map((method) => (
            <option key={method.code} value={method.code}>
              {method.name}
            </option>
          ))}
        </select>
      </div>
      <Field id={id("email")} label="Contact email" name="contactEmail" type="email" defaultValue={council.contactEmail ?? ""} />
      <Field id={id("phone")} label="Contact phone" name="contactPhone" defaultValue={council.contactPhone ?? ""} />
      <Field id={id("portal")} label="Portal URL" name="portalUrl" type="url" defaultValue={council.portalUrl ?? ""} />
      <Field id={id("source")} label="Source URL" name="sourceUrl" type="url" defaultValue={council.sourceUrl ?? ""} hint="The official page you checked. Required to mark the row verified." />
      <Field id={id("notes")} label="Notes" name="notes" defaultValue={council.notes ?? ""} />
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : `Save ${council.name}`}
        </Button>
      </div>
    </form>
  );
}
