import type { Metadata } from "next";
import Link from "next/link";
import { ResendVerificationForm } from "./resend-verification-form";

export const metadata: Metadata = { title: "Verify your email" };

export default function VerifyEmailPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Check your inbox</h1>
      <p className="mt-2 text-sm text-ink-muted">
        We have sent a verification link to your email. Open it to finish setting up your account. The link
        expires in 1 hour.
      </p>
      <div className="mt-6 border-t border-line pt-6">
        <h2 className="text-base font-semibold">Didn&apos;t get the email?</h2>
        <p className="mt-1 text-sm text-ink-muted">Check your spam folder, or send a new link.</p>
        <div className="mt-4">
          <ResendVerificationForm />
        </div>
      </div>
      <p className="mt-6 text-sm">
        <Link href="/sign-in" className="font-medium text-brand hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
