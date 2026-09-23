import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

// In-memory outbox used when EMAIL_PROVIDER=test.
export const testOutbox: MailMessage[] = [];

export async function deliver(message: MailMessage): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER ?? "console";

  switch (provider) {
    case "console":
      // The body holds single-use links, so this adapter must never run in production.
      if (process.env.NODE_ENV === "production") {
        throw new Error("EMAIL_PROVIDER=console is not allowed in production");
      }
      console.info(`[mail] to=${message.to} subject="${message.subject}"\n${message.text}\n[/mail]`);
      return;
    case "test":
      testOutbox.push(message);
      return;
    case "file": {
      // Writes each email to tmp/mail as JSON, so end-to-end tests can open links.
      if (process.env.NODE_ENV === "production") {
        throw new Error("EMAIL_PROVIDER=file is not allowed in production");
      }
      const dir = path.join(process.cwd(), "tmp", "mail");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, `${Date.now()}-${crypto.randomUUID()}.json`), JSON.stringify(message));
      return;
    }
    case "ses":
      await sendWithSes(sesClient(), message);
      return;
    default:
      throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
  }
}

let ses: SESv2Client | undefined;

function sesClient() {
  // Credentials come from the standard AWS chain (instance or task role in production).
  ses ??= new SESv2Client({ region: process.env.AWS_REGION });
  return ses;
}

export async function sendWithSes(client: Pick<SESv2Client, "send">, message: MailMessage) {
  const from = process.env.MAILER_FROM;
  if (!from) throw new Error("MAILER_FROM is required for EMAIL_PROVIDER=ses");
  await client.send(
    new SendEmailCommand({
      FromEmailAddress: from,
      Destination: { ToAddresses: [message.to] },
      Content: {
        Simple: {
          Subject: { Data: message.subject, Charset: "UTF-8" },
          Body: { Html: { Data: message.html, Charset: "UTF-8" }, Text: { Data: message.text, Charset: "UTF-8" } },
        },
      },
    }),
  );
}
