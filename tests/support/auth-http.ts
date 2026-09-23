import { auth } from "@/server/auth";
import { testOutbox } from "@/server/mail/deliver";

const BASE = "http://localhost:3000/api/auth";

type CallOptions = { body?: unknown; cookie?: string; ip?: string; method?: "GET" | "POST" };

// Sends a real HTTP-shaped request through the Better Auth handler, including rate limiting.
export async function callAuth(path: string, { body, cookie, ip = "203.0.113.10", method = "POST" }: CallOptions = {}) {
  const headers = new Headers({ "content-type": "application/json", origin: "http://localhost:3000", "x-forwarded-for": ip });
  if (cookie) headers.set("cookie", cookie);
  const response = await auth.handler(
    new Request(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }),
  );
  const text = await response.text();
  return { status: response.status, json: text ? JSON.parse(text) : null, headers: response.headers };
}

export function sessionCookieFrom(headers: Headers): string | undefined {
  const cookies = headers.getSetCookie().map((value) => value.split(";")[0]);
  const session = cookies.find((value) => value.startsWith("better-auth.session_token="));
  return session;
}

export const VALID_PASSWORD = "correct horse battery staple";

export async function signUp(overrides: Partial<Record<"email" | "password" | "firstName" | "lastName", string>> = {}) {
  const body = {
    email: "landlord@example.com",
    password: VALID_PASSWORD,
    firstName: "Alex",
    lastName: "Nguyen",
    name: "Alex Nguyen",
    ...overrides,
  };
  return callAuth("/sign-up/email", { body });
}

export function lastLinkSentTo(email: string): URL {
  const message = testOutbox.findLast((mail) => mail.to === email);
  if (!message) throw new Error(`No email sent to ${email}`);
  const match = message.text.match(/https?:\/\/\S+/);
  if (!match) throw new Error("No link in email");
  return new URL(match[0].replace(/[)\]]+$/, ""));
}

// Signs up and verifies a user, then returns a signed-in session cookie.
export async function createVerifiedUser(email = "landlord@example.com") {
  await signUp({ email });
  const link = lastLinkSentTo(email);
  await callAuth(`${link.pathname.replace("/api/auth", "")}${link.search}`, { method: "GET" });
  const signIn = await callAuth("/sign-in/email", { body: { email, password: VALID_PASSWORD } });
  const cookie = sessionCookieFrom(signIn.headers);
  if (!cookie) throw new Error(`Sign-in failed: ${signIn.status} ${JSON.stringify(signIn.json)}`);
  return { cookie, userId: signIn.json.user.id as string };
}
