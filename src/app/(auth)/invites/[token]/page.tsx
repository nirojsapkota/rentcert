import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { findInvite } from "@/server/sharing/commands";
import { getSession } from "@/server/session";
import { acceptInviteAction } from "./actions";

export const metadata: Metadata = { title: "Invite" };

const INVALID = "This invite is no longer valid. Ask the owner to send a new one.";

// Open to signed-out visitors. Expired, used, revoked and unknown links all show the same message.
export default async function InvitePage({ params, searchParams }: PageProps<"/invites/[token]">) {
  const [{ token }, { result, error }] = await Promise.all([params, searchParams]);
  const [invite, session] = await Promise.all([findInvite(token), getSession()]);

  if (!invite || result === "invalid") {
    return (
      <>
        <h1 className="text-3xl font-bold text-deep">Invite</h1>
        <div className="mt-6">
          <Alert tone="error">{INVALID}</Alert>
        </div>
      </>
    );
  }

  const user = session?.user;
  const wrongEmail = result === "wrong_email" || (user?.emailVerified && user.email.toLowerCase() !== invite.email);

  return (
    <>
      <h1 className="text-3xl font-bold text-deep">{invite.ownerFirstName} shared their properties with you</h1>
      <p className="mt-2 text-sm text-ink-muted">
        As a collaborator you can see and update {invite.ownerFirstName}&apos;s properties, compliance checks and
        certificates, and you get their reminder emails. You don&apos;t see their billing.
      </p>
      <div className="mt-6 space-y-4">
        {error && <Alert tone="error">That verification link is not valid or has expired. Sign in to get a new one.</Alert>}
        {!user ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={`/sign-in?invite=${token}`} className={buttonClasses()}>
              Sign in to accept
            </Link>
            <Link href={`/sign-up?invite=${token}`} className={buttonClasses("secondary")}>
              Create an account
            </Link>
          </div>
        ) : !user.emailVerified ? (
          <Alert tone="info">
            Verify your email address first.{" "}
            <Link href="/verify-email" className="font-medium underline">
              Send a new verification link
            </Link>
            .
          </Alert>
        ) : wrongEmail ? (
          <Alert tone="error">This invite was sent to a different email address. Sign in with that address to accept.</Alert>
        ) : (
          <form action={acceptInviteAction.bind(null, token)}>
            <Button type="submit" className="w-full">
              Accept invite
            </Button>
          </form>
        )}
      </div>
    </>
  );
}
