import { z } from "zod";
import { addYears, isCalendarDate } from "@/lib/calendar-date";

// Shared by the property form and the server. Keep free of server-only imports.

export const AUSTRALIAN_STATES = [
  { code: "ACT", name: "Australian Capital Territory" },
  { code: "NSW", name: "New South Wales" },
  { code: "NT", name: "Northern Territory" },
  { code: "QLD", name: "Queensland" },
  { code: "SA", name: "South Australia" },
  { code: "TAS", name: "Tasmania" },
  { code: "VIC", name: "Victoria" },
  { code: "WA", name: "Western Australia" },
] as const;

export type AustralianStateCode = (typeof AUSTRALIAN_STATES)[number]["code"];

const STATE_CODES = AUSTRALIAN_STATES.map((state) => state.code) as [AustralianStateCode, ...AustralianStateCode[]];

export const EARLIEST_LEASE_START = "1990-01-01";

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max.toLocaleString("en-AU")} characters or fewer.`)
    .transform((value) => (value === "" ? null : value));

// `today` is YYYY-MM-DD in the user's timezone; it bounds the lease start date.
export function propertySchema(today: string) {
  const latestLeaseStart = addYears(today, 2);
  return z.object({
    addressLine1: z.string().trim().min(1, "Enter the street address.").max(100, "The street address must be 100 characters or fewer."),
    addressLine2: optionalText(100, "Address line 2"),
    suburb: z
      .string()
      .trim()
      .min(1, "Enter the suburb.")
      .max(60, "The suburb must be 60 characters or fewer.")
      .regex(/^[\p{L} '\-.]+$/u, "Use letters, spaces, apostrophes and hyphens only in the suburb."),
    state: z.enum(STATE_CODES, "Choose a state or territory."),
    postcode: z
      .string()
      .trim()
      .regex(/^\d{4}$/, "Enter a 4-digit Australian postcode.")
      .refine((value) => value >= "0200", "Enter a 4-digit Australian postcode."),
    nickname: optionalText(60, "The nickname"),
    notes: optionalText(2000, "Notes"),
    leaseStartDate: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || (isCalendarDate(value) && value >= EARLIEST_LEASE_START && value <= latestLeaseStart),
        "Enter a valid lease start date.",
      )
      .transform((value) => (value === "" ? null : value)),
  });
}

export type PropertyInput = z.infer<ReturnType<typeof propertySchema>>;
export type PropertyField = keyof PropertyInput;
