import type { Page } from "@playwright/test";
import { expect } from "./fixtures";
import { linkFromLatestMail } from "./mail";

export const PASSWORD = "correct horse battery staple";

// Signs up through the UI, opens the verification link and lands on the dashboard.
// A random tag keeps the address unique across retries and --repeat-each runs.
export async function signUpAndVerify(page: Page, baseEmail: string, firstName = "Alex") {
  const email = baseEmail.replace("@", `+${Math.random().toString(36).slice(2, 8)}@`);
  await page.goto("/sign-up");
  await page.getByLabel("First name").fill(firstName);
  await page.getByLabel("Last name").fill("Nguyen");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await page.goto(await linkFromLatestMail(email, "Verify your email for RentCert"));
  await expect(page).toHaveURL(/\/dashboard$/);
  return email;
}

// Fails if the page is wider than the viewport (a phone would zoom out or scroll sideways).
export async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}
