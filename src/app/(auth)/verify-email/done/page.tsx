import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Email verification" };

// Better Auth redirects here after the verification link is opened.
export default async function VerifyEmailDonePage({ searchParams }: PageProps<"/verify-email/done">) {
  const { error } = await searchParams;
  const session = await getSession();
  if (!error && session?.user.emailVerified) redirect("/dashboard");

  return (
    <>
      <h1 className="text-2xl font-bold">Email verification</h1>
      <div className="mt-6">
        {error ? (
          <Alert tone="error">
            This verification link is not valid or has expired.{" "}
            <Link href="/verify-email" className="font-medium underline">
              Send a new link
            </Link>
            .
          </Alert>
        ) : (
          <Alert tone="success">
            Your email is verified.{" "}
            <Link href="/sign-in" className="font-medium underline">
              Sign in
            </Link>{" "}
            to continue.
          </Alert>
        )}
      </div>
    </>
  );
}
