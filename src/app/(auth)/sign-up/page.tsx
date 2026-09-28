import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { inviteReturnPath } from "@/lib/invite-link";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const { invite } = await searchParams;
  const returnTo = inviteReturnPath(invite);
  return (
    <>
      <h1 className="text-3xl font-bold text-deep">Create your account</h1>
      <p className="mt-1 text-sm text-ink-muted">Start tracking your property compliance dates.</p>
      <div className="mt-6 space-y-4">
        {returnTo && <Alert tone="info">Create your account with the email address the invite was sent to, then verify it to accept.</Alert>}
        <SignUpForm returnTo={returnTo} />
      </div>
      <p className="mt-6 text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href={returnTo ? `/sign-in?invite=${String(invite)}` : "/sign-in"} className="font-medium text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
