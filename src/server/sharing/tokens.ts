import "server-only";
import { createHash, randomBytes } from "node:crypto";

export { isInviteToken } from "@/lib/invite-link";

// Invite tokens: 32 random bytes in the link, only the SHA-256 in the database.
export function newInviteToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashInviteToken(token) };
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
