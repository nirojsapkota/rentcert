"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { SetupFormState } from "./compliance-actions";

type Requirement = { code: string; name: string; description: string };

type Props = {
  action: (state: SetupFormState, formData: FormData) => Promise<SetupFormState>;
  requirements: Requirement[];
  today: string;
};

export function SetupForm({ action, requirements, today }: Props) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const errors = state.errors ?? {};
  const values = state.values ?? {};

  return (
    <form action={formAction} noValidate className="space-y-6" key={JSON.stringify(values)}>
      {state.status === "invalid" && <Alert tone="error">{state.message ?? "Answer each check below before you continue."}</Alert>}
      {requirements.map((requirement) => {
        const choice = values[`choice_${requirement.code}`] ?? "date";
        const errorId = `${requirement.code}-error`;
        return (
          <fieldset
            key={requirement.code}
            aria-describedby={errors[requirement.code] ? errorId : undefined}
            className="space-y-3 rounded-lg border border-line bg-surface p-5"
          >
            <legend className="px-1 text-base font-semibold">{requirement.name}</legend>
            <p className="text-sm text-ink-muted">{requirement.description}</p>
            <div className="space-y-2">
              <label className="flex items-start gap-2">
                <input type="radio" name={`choice_${requirement.code}`} value="date" defaultChecked={choice === "date"} className="mt-1" />
                <span className="w-full">
                  <span className="block text-sm font-medium">Last check was on</span>
                  <input
                    type="date"
                    name={`date_${requirement.code}`}
                    aria-label={`${requirement.name}: last check date`}
                    max={today}
                    defaultValue={values[`date_${requirement.code}`] ?? ""}
                    className="mt-1 block w-full max-w-xs rounded-md border border-line bg-surface px-3 py-2 text-base"
                  />
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name={`choice_${requirement.code}`} value="unknown" defaultChecked={choice === "unknown"} />
                I don&apos;t know (treat it as due now)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name={`choice_${requirement.code}`} value="not_applicable" defaultChecked={choice === "not_applicable"} />
                Not applicable to this property
              </label>
            </div>
            {errors[requirement.code] && (
              <p id={errorId} className="text-sm text-danger">
                {errors[requirement.code]}
              </p>
            )}
          </fieldset>
        );
      })}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save and review dates"}
      </Button>
    </form>
  );
}
