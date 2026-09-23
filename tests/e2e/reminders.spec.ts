import { expect, test } from "./fixtures";
import { signUpAndVerify } from "./helpers";
import { linkFromLatestMail } from "./mail";

test("new user gets a welcome email and can turn reminder emails off and on", async ({ page }, testInfo) => {
  const email = await signUpAndVerify(page, `reminders-${testInfo.project.name}@example.com`);
  expect(await linkFromLatestMail(email, "Welcome to RentCert")).toMatch(/\/properties\/new$/);

  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Account" }).click();
  const toggle = page.getByLabel("Email reminders");
  await expect(toggle).toBeChecked();

  await toggle.uncheck();
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Your details have been saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Email reminders")).not.toBeChecked();

  await page.getByLabel("Email reminders").check();
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Your details have been saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Email reminders")).toBeChecked();
});
