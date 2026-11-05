import { z } from "zod";
import { isCalendarDate } from "@/lib/calendar-date";

// Shared by the inspection form and the server. Keep free of server-only imports.

export const INSPECTION_KINDS = [
  { code: "INITIAL", name: "Initial inspection" },
  { code: "PERIODIC", name: "Periodic (4-yearly) inspection" },
  { code: "REINSPECTION", name: "Reinspection after a fail" },
] as const;

export const INSPECTION_OUTCOMES = [
  { code: "PASS", name: "Pass" },
  { code: "FAIL", name: "Fail" },
  { code: "PENDING", name: "Pending" },
] as const;

export const EARLIEST_INSPECTION = "2000-01-01";
export const MAX_PHOTOS_PER_INSPECTION = 10;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max.toLocaleString("en-AU")} characters or fewer.`)
    .transform((value) => (value === "" ? null : value));

const calendarDate = (message: string) => z.string().trim().refine(isCalendarDate, message);

// `today` is YYYY-MM-DD in the inspector's timezone; an inspection cannot be in the future.
export function inspectionSchema(today: string) {
  return z
    .object({
      kind: z.enum(["INITIAL", "PERIODIC", "REINSPECTION"], "Choose the type of inspection."),
      outcome: z.enum(["PASS", "FAIL", "PENDING"], "Choose the outcome."),
      inspectedOn: calendarDate("Enter the inspection date.")
        .refine((value) => value >= EARLIEST_INSPECTION, "Enter a date from 2000 onwards.")
        .refine((value) => value <= today, "The inspection date cannot be in the future."),
      certificateNumber: optionalText(60, "The certificate number"),
      lodgedOn: z
        .string()
        .trim()
        .refine((value) => value === "" || isCalendarDate(value), "Enter a valid lodgement date.")
        .transform((value) => (value === "" ? null : value)),
      notes: optionalText(2000, "Notes"),
    })
    .refine((input) => input.lodgedOn === null || input.lodgedOn >= input.inspectedOn, {
      path: ["lodgedOn"],
      message: "The lodgement date cannot be before the inspection date.",
    });
}

export type InspectionInput = z.output<ReturnType<typeof inspectionSchema>>;
export type InspectionField = keyof InspectionInput;

export const photoCaptionSchema = optionalText(200, "The caption");
