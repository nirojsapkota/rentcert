import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, newUserPage, test } from "./fixtures";
import { expectNoHorizontalOverflow, signUpAndVerify } from "./helpers";

const PDF = path.resolve("tests/fixtures/certificate.pdf");

test("landlord attaches a certificate when marking a check completed (scenario 4)", async ({ page, browser }, testInfo) => {
  await signUpAndVerify(page, `vault-${testInfo.project.name}@example.com`);
  await page.goto("/properties/new");
  await page.getByLabel("Street address").fill("12 Example Street");
  await page.getByLabel("Suburb").fill("Narre Warren");
  await page.getByLabel("State or territory").selectOption("VIC");
  await page.getByLabel("Postcode").fill("3805");
  await page.getByRole("button", { name: "Add property" }).click();
  for (const name of ["Smoke alarm check", "Electrical safety check", "Gas safety check"]) {
    await page.getByRole("group", { name }).getByLabel(/I don't know/).check();
  }
  await page.getByRole("button", { name: "Save and review dates" }).click();
  await expect(page.getByText("Based on the dates you entered")).toBeVisible();

  // A disguised file is rejected and nothing is saved.
  await page.getByRole("link", { name: "Mark gas safety check completed" }).click();
  await page.getByLabel("Certificate or report (optional)").setInputFiles({
    name: "certificate.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("<html><script>alert(1)</script></html>"),
  });
  await page.getByRole("button", { name: "Save completed check" }).click();
  await expect(page.getByText("Upload a PDF, JPG or PNG file. Choose the file again.")).toBeVisible();

  await page.getByLabel("Certificate or report (optional)").setInputFiles(PDF);
  await page.getByRole("button", { name: "Save completed check" }).click();
  await expect(page.getByText(/Gas safety check saved\. Next due:/)).toBeVisible();

  const history = page.getByRole("region", { name: "Compliance history" });
  await expect(history.getByRole("link", { name: "certificate.pdf" })).toBeVisible();

  // Download returns the same bytes.
  const downloadPromise = page.waitForEvent("download");
  await history.getByRole("link", { name: "certificate.pdf" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("certificate.pdf");
  expect(readFileSync(await download.path())).toEqual(readFileSync(PDF));
  const downloadUrl = download.url();

  // Documents page.
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Documents" }).click();
  await expect(page.getByText("1 document")).toBeVisible();
  await expect(page.getByText("Gas safety check ·")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Another signed-in user gets 404 for the same URL.
  const intruder = await newUserPage(browser, testInfo, "intruder");
  await signUpAndVerify(intruder, `vault-intruder-${testInfo.project.name}@example.com`, "Bob");
  const response = await intruder.request.get(downloadUrl);
  expect(response.status()).toBe(404);
  expect(await response.text()).toBe("Not found");

  // Delete from the record page.
  await page.getByRole("link", { name: /^Manage/ }).click();
  await page.locator("summary", { hasText: "Delete certificate.pdf" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByText("The document has been deleted.")).toBeVisible();
  await expect(page.getByText("No certificates uploaded yet.")).toBeVisible();
  expect((await page.request.get(downloadUrl)).status()).toBe(404);
});
