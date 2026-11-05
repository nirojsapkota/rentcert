import { z } from "zod";

// Shared by the client and pool forms and the server. Keep free of server-only imports.

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max.toLocaleString("en-AU")} characters or fewer.`)
    .transform((value) => (value === "" ? null : value));

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Enter the client's name.").max(100, "The name must be 100 characters or fewer."),
  email: z
    .string()
    .trim()
    .max(254, "The email must be 254 characters or fewer.")
    .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email address.")
    .transform((value) => (value === "" ? null : value.toLowerCase())),
  phone: z
    .string()
    .trim()
    .max(30, "The phone number must be 30 characters or fewer.")
    .refine((value) => value === "" || /^[0-9+()\-\s]+$/.test(value), "Use digits, spaces, + ( ) and - only in the phone number.")
    .transform((value) => (value === "" ? null : value)),
  notes: optionalText(2000, "Notes"),
});

export type ClientInput = z.output<typeof clientSchema>;
export type ClientField = keyof ClientInput;

export const POOL_KINDS = [
  { code: "POOL", name: "Pool" },
  { code: "SPA", name: "Spa" },
] as const;

// Pools are Victorian only: postcodes 3000-3999 plus the 8000-series PO box range.
export const poolSchema = z.object({
  clientId: z.uuid("Choose a client."),
  kind: z.enum(["POOL", "SPA"], "Choose pool or spa."),
  addressLine1: z.string().trim().min(1, "Enter the street address.").max(100, "The street address must be 100 characters or fewer."),
  addressLine2: optionalText(100, "Address line 2"),
  suburb: z
    .string()
    .trim()
    .min(1, "Enter the suburb.")
    .max(60, "The suburb must be 60 characters or fewer.")
    .regex(/^[\p{L} '\-.]+$/u, "Use letters, spaces, apostrophes and hyphens only in the suburb."),
  postcode: z
    .string()
    .trim()
    .regex(/^[38]\d{3}$/, "Enter a Victorian postcode (4 digits starting with 3 or 8)."),
  councilId: z
    .string()
    .trim()
    .refine((value) => value === "" || z.uuid().safeParse(value).success, "Choose a council from the list.")
    .transform((value) => (value === "" ? null : value)),
  notes: optionalText(2000, "Notes"),
});

export type PoolInput = z.output<typeof poolSchema>;
export type PoolField = keyof PoolInput;

export const ACCOUNT_TYPES = ["LANDLORD", "INSPECTOR"] as const;
export type AccountTypeCode = (typeof ACCOUNT_TYPES)[number];
