import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-ink-muted">Start tracking your property compliance dates.</p>
      <div className="mt-6">
        <SignUpForm />
      </div>
      <p className="mt-6 text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
