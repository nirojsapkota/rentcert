import { Client } from "pg";
import { E2E_DATABASE_URL } from "../../playwright.config";
import { expect, test } from "./fixtures";
import { expectNoHorizontalOverflow, signUpAndVerify } from "./helpers";

async function sql(query: string, params: unknown[] = []) {
  const client = new Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    await client.query(query, params);
  } finally {
    await client.end();
  }
}

// Each project edits its own council, so the two projects can run in parallel.
const councilFor = (project: string) => (project === "desktop" ? "City of Casey" : "City of Knox");

test("inspector picks a council and sees the lodge panel", async ({ page }, testInfo) => {
  const council = councilFor(testInfo.project.name);
  await signUpAndVerify(page, `councils-${testInfo.project.name}@example.com`, "Ina", "INSPECTOR");

  await page.getByRole("link", { name: "Add client" }).click();
  await page.getByLabel("Name").fill("Sam Pool Owner");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Sam Pool Owner" })).toBeVisible();
  await page.getByRole("link", { name: "Add pool or spa" }).first().click();
  await page.getByLabel("Street address").fill("5 Water Street");
  await page.getByLabel("Suburb").fill("Casey");
  await page.getByLabel("Postcode").fill("3977");
  await page.getByLabel("Council (optional)").selectOption({ label: council });
  await page.getByRole("button", { name: "Add pool or spa" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "5 Water Street" })).toBeVisible();

  await page.getByRole("link", { name: "Log inspection" }).click();
  await page.getByLabel("Inspection date").fill("2026-01-15");
  await page.getByRole("button", { name: "Save inspection" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Inspection on/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How to lodge" })).toBeVisible();
  await expect(page.getByText(council, { exact: true })).toBeVisible();
  await expect(page.getByText("Not yet verified. Check with the council.")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("admin edits a council", async ({ page }, testInfo) => {
  const council = councilFor(testInfo.project.name);
  const email = await signUpAndVerify(page, `council-admin-${testInfo.project.name}@example.com`);
  await sql("UPDATE users SET role = 'ADMIN' WHERE email = $1", [email]);

  try {
    await page.goto("/admin/councils");
    await expect(page.getByRole("heading", { level: 1, name: "Councils" })).toBeVisible();
    await page.getByText(council, { exact: true }).click();
    const form = page.locator("form").filter({ has: page.getByRole("button", { name: `Save ${council}` }) });
    await form.getByLabel("Lodgement method").selectOption("EMAIL");
    await form.getByLabel("Contact email").fill("pools@example.gov.au");
    await form.getByLabel("Source URL").fill("https://example.gov.au/pools");
    await form.getByRole("button", { name: `Save ${council}` }).click();
    await expect(form.getByText("Saved.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  } finally {
    await sql(
      "UPDATE councils SET lodgement_method = 'OTHER', contact_email = NULL, source_url = NULL, verified_at = NULL WHERE name = $1",
      [council],
    );
  }
});
