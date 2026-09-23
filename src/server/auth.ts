import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import {
  DEFAULT_TIMEZONE,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  firstNameSchema,
  fullName,
  lastNameSchema,
} from "@/lib/account-validation";
import { recordAuditEvent } from "@/server/audit";
import { db } from "@/server/db";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/server/mail/messages";
import { deleteAllDocumentsForUser } from "@/server/vault/commands";

const ONE_HOUR_IN_SECONDS = 60 * 60;

function recipient(user: { email: string; name: string; firstName?: unknown }) {
  return { email: user.email, name: typeof user.firstName === "string" ? user.firstName : user.name };
}

function parseName(schema: typeof firstNameSchema, value: unknown): string {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new APIError("BAD_REQUEST", { message: result.error.issues[0].message });
  }
  return result.data;
}

export const auth = betterAuth({
  appName: "RentCert",
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    resetPasswordTokenExpiresIn: ONE_HOUR_IN_SECONDS,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(recipient(user), url);
    },
    onPasswordReset: async ({ user }) => {
      await recordAuditEvent({ userId: user.id, resourceType: "user", resourceId: user.id, action: "user.password_reset" });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: ONE_HOUR_IN_SECONDS,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(recipient(user), url);
    },
    afterEmailVerification: async (user) => {
      await recordAuditEvent({ userId: user.id, resourceType: "user", resourceId: user.id, action: "user.email_verified" });
    },
  },
  user: {
    additionalFields: {
      firstName: { type: "string", required: true, input: true },
      lastName: { type: "string", required: true, input: true },
      timezone: { type: "string", required: false, input: false, defaultValue: DEFAULT_TIMEZONE },
      notificationEmail: { type: "string", required: false, input: false },
    },
    deleteUser: {
      enabled: true,
      // Dependent rows are removed by ON DELETE CASCADE. Stored files are removed here.
      // Keep only a timestamp.
      afterDelete: async (user) => {
        await db.accountDeletion.create({ data: {} });
        try {
          await deleteAllDocumentsForUser(user.id);
        } catch (error) {
          console.error("[auth] failed to delete stored documents after account deletion", error instanceof Error ? error.name : "unknown");
        }
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const firstName = parseName(firstNameSchema, user.firstName);
          const lastName = parseName(lastNameSchema, user.lastName);
          return { data: { ...user, firstName, lastName, name: fullName(firstName, lastName) } };
        },
        after: async (user) => {
          await recordAuditEvent({ userId: user.id, resourceType: "user", resourceId: user.id, action: "user.created" });
        },
      },
      update: {
        before: async (user) => {
          if ("firstName" in user) parseName(firstNameSchema, user.firstName);
          if ("lastName" in user) parseName(lastNameSchema, user.lastName);
        },
      },
    },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/request-password-reset": { window: 300, max: 3 },
      "/send-verification-email": { window: 300, max: 3 },
      "/reset-password": { window: 300, max: 5 },
      "/delete-user": { window: 300, max: 5 },
    },
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
