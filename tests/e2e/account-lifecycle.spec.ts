import { expect, test } from "@playwright/test";
import { linkFromLatestMail } from "./mail";

const PASSWORD = "correct horse battery staple";
const NEW_PASSWORD = "a brand new long password";

test("landlord signs up, verifies, manages the account and deletes it", async ({ page }, testInfo) => {
  const email = `landlord-${testInfo.project.name}@example.com`;

  // Scenario 1: sign up requests email verification.
  await page.goto("/");
  await page.getByRole("link", { name: "Start free" }).click();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await page.getByLabel("First name").fill("Alex");
  await page.getByLabel("Last name").fill("Nguyen");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("too-short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use at least 12 characters.")).toBeVisible();

  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();

  // Unverified users cannot sign in.
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Verify your email first.")).toBeVisible();

  // Opening the verification link signs the user in.
  await page.goto(await linkFromLatestMail(email, "Verify your email for RentCert"));
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Alex");
  await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Dashboard" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  // Profile update.
  await page.getByRole("link", { name: "Account" }).click();
  await expect(page.getByRole("heading", { name: "Your details" })).toBeVisible();
  await page.getByLabel("First name").fill("Sam");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Your details have been saved.")).toBeVisible();

  // Sign out, then signed-in pages redirect to sign in.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in$/);

  // Password reset.
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("If an account exists for that email")).toBeVisible();
  await page.goto(await linkFromLatestMail(email, "Reset your RentCert password"));
  await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Confirm new password").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText("Your password has been reset.")).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Sam");

  // Account deletion.
  await page.goto("/account");
  await page.getByLabel("Current password").fill(NEW_PASSWORD);
  await page.getByLabel('Type "DELETE" to confirm').fill("DELETE");
  await page.getByRole("button", { name: "Delete my account permanently" }).click();
  await expect(page.getByText("Your account and its data have been deleted.")).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("That email and password don't match.")).toBeVisible();
});

test("health endpoint reports ok", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
});
