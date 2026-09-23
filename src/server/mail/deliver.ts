import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

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
    default:
      throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
  }
}
