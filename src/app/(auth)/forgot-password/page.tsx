import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Reset your password</h1>
      <p className="mt-1 text-sm text-ink-muted">Enter your account email. We will send you a reset link.</p>
      <div className="mt-6">
        <ForgotPasswordForm />
      </div>
      <p className="mt-6 text-sm">
        <Link href="/sign-in" className="font-medium text-brand hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
