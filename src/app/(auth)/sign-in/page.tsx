import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { reset, deleted } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-bold">Sign in</h1>
      <div className="mt-6 space-y-4">
        {reset === "1" && <Alert tone="success">Your password has been reset. Sign in with your new password.</Alert>}
        {deleted === "1" && <Alert tone="success">Your account and its data have been deleted.</Alert>}
        <SignInForm />
      </div>
      <div className="mt-6 flex flex-col gap-2 text-sm text-ink-muted sm:flex-row sm:justify-between">
        <Link href="/forgot-password" className="font-medium text-brand hover:underline">
          Forgot your password?
        </Link>
        <span>
          New to RentCert?{" "}
          <Link href="/sign-up" className="font-medium text-brand hover:underline">
            Create an account
          </Link>
        </span>
      </div>
    </>
  );
}
