import { z } from "zod";

// Shared by browser forms and server code, so it must stay free of server-only imports.

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export const DEFAULT_TIMEZONE = "Australia/Melbourne";

const personName = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter your ${label}.`)
    .max(60, `Your ${label} must be 60 characters or fewer.`);

export const firstNameSchema = personName("first name");
export const lastNameSchema = personName("last name");

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`);

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));

export function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-AU", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const signUpSchema = z.object({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const profileSchema = z.object({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  timezone: z.string().refine(isValidTimezone, "Choose a valid timezone."),
  notificationEmail: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => (value === "" ? null : value))
    .pipe(z.email("Enter a valid notification email address.").nullable()),
  // Checkbox: present ("on") when ticked, missing when not.
  reminderEmailsEnabled: z.preprocess((value) => value === "on" || value === true, z.boolean()),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}
