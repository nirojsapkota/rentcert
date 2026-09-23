import "server-only";
import { render } from "@react-email/components";
import type { ReactElement } from "react";
import { deliver } from "./deliver";
import { ActionEmail } from "./templates/action-email";

type Recipient = { email: string; name: string };

async function send(to: string, subject: string, element: ReactElement) {
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  await deliver({ to, subject, html, text });
}

// Auth emails always go to the sign-in email, never to notification_email.
export async function sendVerificationEmail(user: Recipient, url: string) {
  await send(
    user.email,
    "Verify your email for RentCert",
    <ActionEmail
      preview="Confirm your email address to start using RentCert."
      heading="Verify your email"
      greetingName={user.name}
      body="Confirm your email address to finish setting up your RentCert account."
      actionLabel="Verify email"
      actionUrl={url}
      footnote="This link expires in 1 hour. If you did not create a RentCert account, ignore this email."
    />,
  );
}

export async function sendPasswordResetEmail(user: Recipient, url: string) {
  await send(
    user.email,
    "Reset your RentCert password",
    <ActionEmail
      preview="Use this link to choose a new password."
      heading="Reset your password"
      greetingName={user.name}
      body="We received a request to reset your RentCert password."
      actionLabel="Choose a new password"
      actionUrl={url}
      footnote="This link expires in 1 hour. If you did not ask for a reset, ignore this email. Your password stays the same."
    />,
  );
}
