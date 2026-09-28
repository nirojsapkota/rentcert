import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token, error } = await searchParams;
  const validToken = typeof token === "string" && token.length > 0 && !error;

  return (
    <>
      <h1 className="text-3xl font-bold text-deep">Choose a new password</h1>
      <div className="mt-6">
        {validToken ? (
          <ResetPasswordForm token={token} />
        ) : (
          <Alert tone="error">
            This reset link is not valid or has expired.{" "}
            <Link href="/forgot-password" className="font-medium underline">
              Request a new link
            </Link>
            .
          </Alert>
        )}
      </div>
    </>
  );
}
