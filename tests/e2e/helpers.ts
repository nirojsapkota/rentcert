import type { Page } from "@playwright/test";
import { expect } from "./fixtures";
import { linkFromLatestMail } from "./mail";

export const PASSWORD = "correct horse battery staple";

// Signs up through the UI, opens the verification link and lands on the dashboard.
export async function signUpAndVerify(page: Page, email: string, firstName = "Alex") {
  await page.goto("/sign-up");
  await page.getByLabel("First name").fill(firstName);
  await page.getByLabel("Last name").fill("Nguyen");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await page.goto(await linkFromLatestMail(email, "Verify your email for RentCert"));
  await expect(page).toHaveURL(/\/dashboard$/);
}
