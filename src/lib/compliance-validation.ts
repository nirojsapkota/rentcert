import { z } from "zod";
import { isCalendarDate } from "@/lib/calendar-date";

// Shared by compliance forms and the server. Keep free of server-only imports.

export const EARLIEST_CHECK_DATE = "1990-01-01";

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max.toLocaleString("en-AU")} characters or fewer.`)
    .transform((value) => (value === "" ? null : value));

// A past check date: valid, from 1990, and not after today (YYYY-MM-DD in the user's timezone).
export function checkDateSchema(today: string, requiredMessage = "Enter the date the check was completed.") {
  return z
    .string()
    .trim()
    .min(1, requiredMessage)
    .refine(isCalendarDate, "Enter a valid date.")
    .refine((value) => value >= EARLIEST_CHECK_DATE, "Enter a date from 1990 onwards.")
    .refine((value) => value <= today, "The date can't be in the future.");
}

export function completionSchema(today: string) {
  return z.object({
    completedOn: checkDateSchema(today),
    providerName: optionalText(120, "Provider name"),
    providerLicenceNumber: optionalText(60, "Licence number"),
    notes: optionalText(2000, "Notes"),
  });
}

export type CompletionInput = z.infer<ReturnType<typeof completionSchema>>;
export type CompletionField = keyof CompletionInput;

export const SETUP_CHOICES = ["date", "unknown", "not_applicable"] as const;
export type SetupChoice = (typeof SETUP_CHOICES)[number];

export type SetupAnswer = { choice: "date"; lastCheckOn: string } | { choice: "unknown" } | { choice: "not_applicable" };

// Parses the setup form: for each code, `choice_<code>` and (when choice is "date") `date_<code>`.
export function parseSetupAnswers(
  codes: string[],
  read: (name: string) => string,
  today: string,
): { ok: true; answers: Record<string, SetupAnswer> } | { ok: false; errors: Record<string, string> } {
  const answers: Record<string, SetupAnswer> = {};
  const errors: Record<string, string> = {};
  for (const code of codes) {
    const choice = read(`choice_${code}`);
    if (choice === "unknown" || choice === "not_applicable") {
      answers[code] = { choice };
    } else if (choice === "date") {
      const date = checkDateSchema(today, "Enter the last check date, or choose another option.").safeParse(read(`date_${code}`));
      if (date.success) answers[code] = { choice: "date", lastCheckOn: date.data };
      else errors[code] = date.error.issues[0].message;
    } else {
      errors[code] = "Choose an option.";
    }
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, answers };
}
