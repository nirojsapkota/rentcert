import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SESv2Client } from "@aws-sdk/client-sesv2";
import { SendEmailCommand } from "@aws-sdk/client-sesv2";
import { sendWithSes, testOutbox } from "@/server/mail/deliver";
import { reminderContent, sendReminderEmail, sendWelcomeEmail, type ReminderDetails } from "@/server/mail/messages";

const details = (type: ReminderDetails["type"], daysRemaining: number): ReminderDetails => ({
  type,
  checkName: "Gas safety check",
  propertyLabel: "12 Smith Street",
  propertyId: "0192f0a4-5b6c-7d8e-9f00-112233445566",
  dueDate: "28 October 2026",
  daysRemaining,
});

const BANNED = /breaking the law|illegal|unlawful|fined|\bfine\b|penalt|non-compliant|\bcompliant\b|guarantee/i;

beforeEach(() => {
  testOutbox.length = 0;
});

describe("reminder wording", () => {
  it("matches the PLAN.md examples", () => {
    expect(reminderContent(details("DAYS_30", 30)).subject).toBe("Gas safety check for 12 Smith Street is due in 30 days");
    expect(reminderContent(details("DAYS_30", 30)).paragraphs[0]).toBe("Your gas safety check for 12 Smith Street is due in 30 days.");
    expect(reminderContent(details("DAYS_7", 1)).subject).toBe("Gas safety check for 12 Smith Street is due in 1 day");
    expect(reminderContent(details("DUE_DATE", 0)).subject).toBe("Gas safety check for 12 Smith Street is due today");
    expect(reminderContent(details("OVERDUE_7", -7)).paragraphs).toContain(
      "This record is past the due date entered in RentCert. Please confirm the applicable requirement and arrange the relevant check if required.",
    );
  });

  it("states the real days remaining when a reminder goes out late", () => {
    expect(reminderContent(details("DAYS_30", 14)).subject).toMatch(/due in 14 days$/);
  });

  it.each(["DAYS_30", "DAYS_7", "DUE_DATE", "OVERDUE_7"] as const)("renders %s with the details and no legal claims", async (type) => {
    await sendReminderEmail("owner@example.com", "Alex", details(type, type === "DAYS_30" ? 30 : type === "DAYS_7" ? 7 : type === "DUE_DATE" ? 0 : -7));
    const [mail] = testOutbox;
    expect(mail.to).toBe("owner@example.com");
    expect(mail.text).toContain("12 Smith Street");
    expect(mail.text).toContain("28 October 2026");
    expect(mail.text).toContain("View property");
    expect(mail.text).toContain("http://localhost:3000/properties/0192f0a4-5b6c-7d8e-9f00-112233445566");
    expect(mail.text).toContain("turn off reminder emails");
    expect(`${mail.subject}\n${mail.text}`).not.toMatch(BANNED);
  });

  it("renders the welcome email without legal claims", async () => {
    await sendWelcomeEmail({ email: "new@example.com", name: "Sam" });
    expect(testOutbox[0]).toMatchObject({ to: "new@example.com", subject: "Welcome to RentCert" });
    expect(testOutbox[0].text).not.toMatch(BANNED);
  });
});

describe("sendWithSes", () => {
  it("sends HTML and text with the configured sender", async () => {
    vi.stubEnv("MAILER_FROM", "RentCert <reminders@rentcert.example>");
    const send = vi.fn(async () => ({}));
    await sendWithSes({ send } as unknown as SESv2Client, { to: "a@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi" });

    const command = (send.mock.calls[0] as unknown[])[0] as SendEmailCommand;
    expect(command).toBeInstanceOf(SendEmailCommand);
    expect(command.input).toMatchObject({
      FromEmailAddress: "RentCert <reminders@rentcert.example>",
      Destination: { ToAddresses: ["a@example.com"] },
      Content: { Simple: { Subject: { Data: "Hi" }, Body: { Html: { Data: "<p>Hi</p>" }, Text: { Data: "Hi" } } } },
    });
    vi.unstubAllEnvs();
  });
});
