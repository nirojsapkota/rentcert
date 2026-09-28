import "server-only";
import { render } from "@react-email/components";
import type { ReactElement } from "react";
import { deliver } from "./deliver";
import type { ReminderType } from "@/generated/prisma/client";
import { appUrl } from "./app-url";
import { ActionEmail } from "./templates/action-email";
import { ReminderEmail } from "./templates/reminder-email";
import { WelcomeEmail } from "./templates/welcome-email";

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

export async function sendWelcomeEmail(user: Recipient) {
  await send(
    user.email,
    "Welcome to RentCert",
    <WelcomeEmail greetingName={user.name} addPropertyUrl={appUrl("/properties/new")} />,
  );
}

// Invite emails name the owner only: no addresses, because the recipient has not accepted yet.
export async function sendSharingInviteEmail(to: string, ownerFirstName: string, url: string) {
  await send(
    to,
    `${ownerFirstName} shared their properties with you on RentCert`,
    <ActionEmail
      preview={`${ownerFirstName} invited you to help keep track of their rental property checks.`}
      heading="You've been invited"
      greetingName="there"
      body={`${ownerFirstName} invited you to see and manage their properties on RentCert: compliance check dates, certificates and reminders. Accept with the email address this message was sent to.`}
      actionLabel="View the invite"
      actionUrl={url}
      footnote="This invite expires in 7 days. If you don't know this person, ignore this email."
    />,
  );
}

export async function sendSharingEndedEmail(user: Recipient, ownerFirstName: string) {
  await send(
    user.email,
    `${ownerFirstName} closed their RentCert account`,
    <ActionEmail
      preview="You no longer have access to their properties."
      heading="Shared properties removed"
      greetingName={user.name}
      body={`${ownerFirstName} closed their RentCert account, so you no longer have access to their properties. Your own account and properties are not affected.`}
      actionLabel="Open RentCert"
      actionUrl={appUrl("/dashboard")}
      footnote="You received this because you were a collaborator on their account."
    />,
  );
}

export type ReminderDetails = {
  type: ReminderType;
  checkName: string; // for example "Gas safety check"
  propertyLabel: string; // for example "12 Smith Street"
  propertyId: string;
  dueDate: string; // formatted, for example "28 October 2026"
  daysRemaining: number; // at send time, in the user's timezone; a late reminder states the real number
};

// Subject and body text for each reminder type. Neutral wording only: RentCert tracks the dates
// the landlord entered and never says whether a property is legally compliant.
export function reminderContent({ type, checkName, propertyLabel, daysRemaining }: ReminderDetails) {
  const lower = checkName.charAt(0).toLowerCase() + checkName.slice(1);
  const subject = `${checkName} for ${propertyLabel}`;
  switch (type) {
    case "DAYS_30":
    case "DAYS_7": {
      const days = daysRemaining === 1 ? "1 day" : `${daysRemaining} days`;
      return {
        subject: `${subject} is due in ${days}`,
        heading: `Due in ${days}`,
        paragraphs: [`Your ${lower} for ${propertyLabel} is due in ${days}.`],
        dueDateLabel: "Due date",
      };
    }
    case "DUE_DATE":
      return {
        subject: `${subject} is due today`,
        heading: "Due today",
        paragraphs: [`Your ${lower} for ${propertyLabel} is due today.`, "The due date you entered for this check is today."],
        dueDateLabel: "Due date",
      };
    case "OVERDUE_7":
      return {
        subject: `${subject} is overdue`,
        heading: "Your compliance record is overdue",
        paragraphs: [
          `Your compliance record is overdue: the ${lower} for ${propertyLabel}.`,
          "This record is past the due date entered in RentCert. Please confirm the applicable requirement and arrange the relevant check if required.",
        ],
        dueDateLabel: "Due date entered",
      };
  }
}

export async function sendReminderEmail(to: string, greetingName: string, details: ReminderDetails) {
  const content = reminderContent(details);
  await send(
    to,
    content.subject,
    <ReminderEmail
      preview={content.paragraphs[0]}
      heading={content.heading}
      greetingName={greetingName}
      paragraphs={content.paragraphs}
      dueDateLabel={content.dueDateLabel}
      dueDate={details.dueDate}
      propertyUrl={appUrl(`/properties/${details.propertyId}`)}
      accountUrl={appUrl("/account")}
    />,
  );
}
