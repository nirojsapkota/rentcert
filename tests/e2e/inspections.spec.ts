import path from "node:path";
import { expect, test } from "./fixtures";
import { expectNoHorizontalOverflow, signUpAndVerify } from "./helpers";

test("inspector logs a pass, sees the recall date and uploads a photo", async ({ page }, testInfo) => {
  await signUpAndVerify(page, `inspections-${testInfo.project.name}@example.com`, "Ina", "INSPECTOR");

  await page.getByRole("link", { name: "Add client" }).click();
  await page.getByLabel("Name").fill("Sam Pool Owner");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Sam Pool Owner" })).toBeVisible();
  await page.getByRole("link", { name: "Add pool or spa" }).first().click();
  await page.getByLabel("Street address").fill("5 Water Street");
  await page.getByLabel("Suburb").fill("Casey");
  await page.getByLabel("Postcode").fill("3977");
  await page.getByRole("button", { name: "Add pool or spa" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "5 Water Street" })).toBeVisible();

  await page.getByRole("link", { name: "Log inspection" }).click();
  await page.getByLabel("Inspection date").fill("2026-01-15");
  await page.getByLabel("Certificate number (optional)").fill("CERT-1");
  await page.getByRole("button", { name: "Save inspection" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Inspection on/ })).toBeVisible();
  await expect(page.getByText("15 January 2030")).toBeVisible();

  await page.getByLabel("Photo", { exact: true }).setInputFiles(path.resolve("tests/fixtures/photo.png"));
  await page.getByLabel("Caption (optional)").fill("Gate latch");
  await page.getByRole("button", { name: "Upload photo" }).click();
  await expect(page.getByText("Photo uploaded.")).toBeVisible();
  await expect(page.getByRole("link", { name: "photo.png" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: "5 Water Street" }).click();
  await expect(page.getByText("Next recall based on the dates you entered: 15 January 2030")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
