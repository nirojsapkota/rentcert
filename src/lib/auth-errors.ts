// Maps Better Auth error codes to plain sentences for forms.
const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "That email and password don't match. Check them and try again.",
  EMAIL_NOT_VERIFIED: "Verify your email first. We have sent you a new verification link.",
  PASSWORD_TOO_SHORT: "Use at least 12 characters for your password.",
  PASSWORD_TOO_LONG: "Use 128 characters or fewer for your password.",
  INVALID_PASSWORD: "That password is not correct.",
  INVALID_TOKEN: "This link is not valid or has expired. Request a new one.",
  TOKEN_EXPIRED: "This link has expired. Request a new one.",
};

const FALLBACK = "Something went wrong. Please try again.";
const RATE_LIMITED = "Too many attempts. Wait a minute and try again.";

export function authErrorMessage(error: { code?: string; message?: string; status?: number } | null | undefined): string {
  if (!error) return FALLBACK;
  if (error.status === 429) return RATE_LIMITED;
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  // Validation errors raised by our own hooks carry a readable message.
  if (error.status === 400 && error.message && !error.code) return error.message;
  return FALLBACK;
}
