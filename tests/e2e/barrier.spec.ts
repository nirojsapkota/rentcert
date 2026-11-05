import { expect, test } from "./fixtures";
import { expectNoHorizontalOverflow, signUpAndVerify } from "./helpers";

test("inspector adds a client and a pool, and landlords cannot see the register", async ({ page }, testInfo) => {
  await signUpAndVerify(page, `inspector-${testInfo.project.name}@example.com`, "Ina", "INSPECTOR");

  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav.getByRole("link", { name: "Clients" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Properties" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Add your first client" })).toBeVisible();

  await page.getByRole("link", { name: "Add client" }).click();
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByText("Enter the client's name.")).toBeVisible();
  await page.getByLabel("Name").fill("Sam Pool Owner");
  await page.getByLabel("Email (optional)").fill("sam@example.com");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Sam Pool Owner" })).toBeVisible();

  await page.getByRole("link", { name: "Add pool or spa" }).first().click();
  await expect(page.getByLabel("Client")).not.toHaveValue("");
  await page.getByLabel("Street address").fill("5 Water Street");
  await page.getByLabel("Suburb").fill("Casey");
  await page.getByLabel("Postcode").fill("2000");
  await page.getByRole("button", { name: "Add pool or spa" }).click();
  await expect(page.getByText("Enter a Victorian postcode (4 digits starting with 3 or 8).")).toBeVisible();
  await page.getByLabel("Postcode").fill("3977");
  await page.getByRole("button", { name: "Add pool or spa" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "5 Water Street" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("Archived", { exact: true })).toBeVisible();

  await nav.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByRole("link", { name: /1\s*Client/ })).toBeVisible();
});

test("landlord gets not found on the inspector register", async ({ page }, testInfo) => {
  await signUpAndVerify(page, `landlord-register-${testInfo.project.name}@example.com`);
  const response = await page.goto("/clients");
  expect(response?.status()).toBe(404);
});
