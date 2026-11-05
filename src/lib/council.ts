import { z } from "zod";

export const LODGEMENT_METHODS = [
  { code: "PORTAL", name: "Online portal" },
  { code: "EMAIL", name: "Email" },
  { code: "POST", name: "Post" },
  { code: "OTHER", name: "Other or not known" },
] as const;

export type LodgementMethodCode = (typeof LODGEMENT_METHODS)[number]["code"];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use ${max} characters or fewer.`)
    .transform((value) => (value === "" ? null : value));

const optionalHttps = z
  .string()
  .trim()
  .transform((value) => value || null)
  .pipe(z.url({ protocol: /^https$/, message: "Use an https:// link." }).max(500).nullable());

export const councilSchema = z.object({
  lodgementMethod: z.enum(["PORTAL", "EMAIL", "POST", "OTHER"], "Choose a lodgement method."),
  contactEmail: z
    .string()
    .trim()
    .max(254)
    .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email address.")
    .transform((value) => (value === "" ? null : value.toLowerCase())),
  contactPhone: z
    .string()
    .trim()
    .max(30)
    .refine((value) => value === "" || /^[0-9+()\-\s]+$/.test(value), "Use digits, spaces, + ( ) and - only in the phone number.")
    .transform((value) => (value === "" ? null : value)),
  portalUrl: optionalHttps,
  sourceUrl: optionalHttps,
  notes: optionalText(2000),
});

export type CouncilInput = z.output<typeof councilSchema>;

// Wording for a council's lodge details. Never authoritative.
export function lodgeNotice(verifiedAt: Date | null): string {
  return verifiedAt
    ? `Based on information we last checked on ${verifiedAt.toLocaleDateString("en-AU", { timeZone: "UTC" })}. Check with the council before you lodge.`
    : "Not yet verified. Check with the council.";
}
