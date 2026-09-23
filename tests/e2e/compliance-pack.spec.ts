import { readFileSync } from "node:fs";
import { flat, pdfPages } from "../support/pdf-text";
import { expect, newUserPage, test } from "./fixtures";
import { signUpAndVerify } from "./helpers";

test("landlord downloads a compliance pack for the right property (scenario 7)", async ({ page, browser }, testInfo) => {
  await signUpAndVerify(page, `pack-${testInfo.project.name}@example.com`);
  await page.goto("/properties/new");
  await page.getByLabel("Street address").fill("12 Smith Street");
  await page.getByLabel("Suburb").fill("Narre Warren");
  await page.getByLabel("State or territory").selectOption("VIC");
  await page.getByLabel("Postcode").fill("3805");
  await page.getByRole("button", { name: "Add property" }).click();
  await page.getByRole("group", { name: "Smoke alarm check" }).getByLabel("Smoke alarm check: last check date").fill("2025-10-11");
  await page.getByRole("group", { name: "Electrical safety check" }).getByLabel(/I don't know/).check();
  await page.getByRole("group", { name: "Gas safety check" }).getByLabel("Gas safety check: last check date").fill("2024-09-02");
  await page.getByRole("button", { name: "Save and review dates" }).click();
  await expect(page.getByText("Based on the dates you entered")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download Compliance Pack" }).click();
  const download = await downloadPromise;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(new Date());
  expect(download.suggestedFilename()).toBe(`RentCert compliance pack - 12 Smith Street - ${today}.pdf`);

  const bytes = readFileSync(await download.path());
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  const text = flat(await pdfPages(new Uint8Array(bytes)));
  const generated = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Melbourne" }).format(new Date());
  expect(text).toContain("12 Smith Street Narre Warren VIC 3805");
  expect(text).toContain(`Generated: ${generated}`);
  expect(text).toContain("Smoke alarm check 11 October 2025 11 October 2026");
  expect(text).toContain("Gas safety check 2 September 2024 2 September 2026");
  expect(text).toContain("Last check unknown");
  expect(text).toContain("This document is not a certificate and does not confirm legal compliance.");

  // Another user gets 404 for the same URL.
  const intruder = await newUserPage(browser, testInfo, "intruder");
  await signUpAndVerify(intruder, `pack-intruder-${testInfo.project.name}@example.com`, "Bob");
  const response = await intruder.request.get(download.url());
  expect(response.status()).toBe(404);
});
