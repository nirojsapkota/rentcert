import type { Page } from "@playwright/test";
import { expect, newUserPage, test } from "./fixtures";
import { expectNoHorizontalOverflow, PASSWORD, signUpAndVerify } from "./helpers";
import { linkFromLatestMail } from "./mail";

async function addPropertyWithUnknownDates(page: Page, street: string) {
  await page.goto("/properties/new");
  await page.getByLabel("Street address").fill(street);
  await page.getByLabel("Suburb").fill("Narre Warren");
  await page.getByLabel("State or territory").selectOption("VIC");
  await page.getByLabel("Postcode").fill("3805");
  await page.getByRole("button", { name: "Add property" }).click();
  await expect(page.getByRole("heading", { name: "Review compliance dates" })).toBeVisible();
  for (const check of ["Smoke alarm check", "Electrical safety check", "Gas safety check"]) {
    await page.getByRole("group", { name: check }).getByLabel(/I don't know/).check();
  }
  await page.getByRole("button", { name: "Save and review dates" }).click();
  await expect(page.getByText("Based on the dates you entered")).toBeVisible();
  return page.url();
}

async function invite(page: Page, email: string) {
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Sharing" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Sharing" })).toBeVisible();
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText(`Invite sent to ${email}`)).toBeVisible();
}

test("a new person accepts an invite, works on the property, then loses access", async ({ page, browser }, testInfo) => {
  await signUpAndVerify(page, `share-owner-${testInfo.project.name}@example.com`, "Olivia");
  const propertyUrl = await addPropertyWithUnknownDates(page, "7 Shared Street");
  const memberEmail = `share-member-${testInfo.project.name}+${Math.random().toString(36).slice(2, 8)}@example.com`;
  await invite(page, memberEmail);
  await expect(page.getByText("Invite pending")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // The invitee has no account: sign up from the invite, verify, and come back to accept.
  const member = await newUserPage(browser, testInfo, "member");
  await member.goto(await linkFromLatestMail(memberEmail, "Olivia shared their properties with you on RentCert"));
  await expect(member.getByRole("heading", { name: "Olivia shared their properties with you" })).toBeVisible();
  await expectNoHorizontalOverflow(member);
  await member.getByRole("link", { name: "Create an account" }).click();
  await expect(member.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await member.getByLabel("First name").fill("Sam");
  await member.getByLabel("Last name").fill("Nguyen");
  await member.getByLabel("Email").fill(memberEmail);
  await member.getByLabel("Password").fill(PASSWORD);
  await member.getByRole("button", { name: "Create account" }).click();
  await expect(member.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await member.goto(await linkFromLatestMail(memberEmail, "Verify your email for RentCert"));
  await expect(member).toHaveURL(/\/invites\//);
  await member.getByRole("button", { name: "Accept invite" }).click();
  await expect(member.getByText("Invite accepted.")).toBeVisible();

  // The collaborator sees the property as shared, without owner-only actions, and records a check.
  await member.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Properties" }).click();
  await expect(member.getByRole("heading", { level: 1, name: "Properties" })).toBeVisible();
  await expect(member.getByText("Shared by Olivia", { exact: true })).toBeVisible();
  await member.getByRole("link", { name: /7 Shared Street/ }).click();
  await expect(member.getByRole("heading", { level: 1, name: "7 Shared Street" })).toBeVisible();
  await expect(member.getByRole("link", { name: "Edit" })).toHaveCount(0);
  await expect(member.getByRole("button", { name: "Archive" })).toHaveCount(0);
  await member.getByRole("link", { name: "Mark gas safety check completed" }).click();
  await expect(member.getByRole("heading", { name: "Mark gas safety check completed" })).toBeVisible();
  await member.getByLabel("Completed date").fill(new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(new Date()));
  await member.getByRole("button", { name: "Save completed check" }).click();
  await expect(member.getByText(/Gas safety check saved\. Next due:/)).toBeVisible();

  // The owner removes them; their next request is a 404.
  await page.goto("/sharing");
  await expect(page.getByText("Sam Nguyen")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("You haven't shared your properties with anyone.")).toBeVisible();
  const response = await member.goto(propertyUrl);
  expect(response?.status()).toBe(404);
});

test("an existing user accepts, and the owner transfers a property to them", async ({ page, browser }, testInfo) => {
  await signUpAndVerify(page, `transfer-owner-${testInfo.project.name}@example.com`, "Olivia");
  const propertyUrl = await addPropertyWithUnknownDates(page, "9 Transfer Road");

  const member = await newUserPage(browser, testInfo, "member");
  const memberEmail = await signUpAndVerify(member, `transfer-member-${testInfo.project.name}@example.com`, "Sam");
  await invite(page, memberEmail);

  await member.goto(await linkFromLatestMail(memberEmail, "Olivia shared their properties with you on RentCert"));
  await member.getByRole("button", { name: "Accept invite" }).click();
  await expect(member.getByText("Invite accepted.")).toBeVisible();

  await page.goto(propertyUrl);
  await expect(page.getByRole("heading", { name: "Transfer property" })).toBeVisible();
  await page.getByLabel("New owner").selectOption({ label: "Sam Nguyen" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Transfer" }).click();
  await expect(page.getByText("The property has been transferred.")).toBeVisible();
  expect((await page.goto(propertyUrl))?.status()).toBe(404);

  await member.goto(propertyUrl);
  await expect(member.getByRole("heading", { level: 1, name: "9 Transfer Road" })).toBeVisible();
  await expect(member.getByText("Shared by Olivia")).toHaveCount(0);
  await expect(member.getByRole("link", { name: "Edit" })).toBeVisible();
});
