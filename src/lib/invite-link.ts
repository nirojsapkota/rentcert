// Invite tokens are 32 random bytes in base64url. Shared by the auth forms (browser) and the server.
const INVITE_TOKEN = /^[A-Za-z0-9_-]{43}$/;

export function isInviteToken(value: unknown): value is string {
  return typeof value === "string" && INVITE_TOKEN.test(value);
}

// The only return target accepted after sign-in or sign-up, so `?invite=` cannot become an open redirect.
export function inviteReturnPath(token: unknown): string | undefined {
  return isInviteToken(token) ? `/invites/${token}` : undefined;
}
