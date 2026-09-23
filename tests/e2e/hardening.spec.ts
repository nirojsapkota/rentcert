import { readFileSync } from "node:fs";
import { unzipSync } from "fflate";
import { Client } from "pg";
import { E2E_DATABASE_URL } from "../../playwright.config";
import { expect, test } from "./fixtures";
import { expectNoHorizontalOverflow, signUpAndVerify } from "./helpers";

async function grantAdmin(email: string) {
  const client = new Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  await client.query("UPDATE users SET role = 'ADMIN' WHERE email = $1", [email]);
  await client.end();
}

test("public pages load, link together and fit on a phone", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Never miss a rental compliance deadline again." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Frequently asked questions" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  for (const [link, heading] of [["Pricing", "Pricing"], ["Privacy", "Privacy Policy"], ["Terms", "Terms of Service"]] as const) {
    await page.getByRole("contentinfo").getByRole("link", { name: link }).click();
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
  await expect(page.getByText("Draft – requires legal review before launch.")).toBeVisible();
});

test("admin pages are hidden from users and work for admins", async ({ page }, testInfo) => {
  const email = await signUpAndVerify(page, `admin-${testInfo.project.name}@example.com`);

  const hidden = await page.goto("/admin");
  expect(hidden?.status()).toBe(404);
  await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Admin" })).toHaveCount(0);

  await grantAdmin(email);
  await page.goto("/dashboard");
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Admin" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Admin" })).toBeVisible();
  await expect(page.getByText("MRR (AUD, incl. GST)")).toBeVisible();

  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Users" }).click();
  await page.getByLabel("Search by email").fill(email);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("cell", { name: `${email} (admin)` })).toBeVisible();

  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Settings" }).click();
  await expect(page.getByLabel("Free trial length (days)")).toHaveValue("365");
  await page.getByLabel("Free trial length (days)").fill("999");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Enter a whole number of days from 0 to 730.")).toBeVisible();

  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Requirements" }).click();
  await expect(page.getByRole("heading", { name: "VIC · gas" })).toBeVisible();
  await expect(page.getByText("Not yet verified").first()).toBeVisible();
});

test("a user exports their data as a ZIP", async ({ page }, testInfo) => {
  const email = await signUpAndVerify(page, `export-${testInfo.project.name}@example.com`);
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Account" }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export my data" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^rentcert-export-\d{4}-\d{2}-\d{2}\.zip$/);

  const files = unzipSync(new Uint8Array(readFileSync(await download.path())));
  expect(Object.keys(files)).toContain("account.json");
  expect(new TextDecoder().decode(files["account.json"])).toContain(email);
});

test("pages send a nonce CSP and run without CSP violations", async ({ page }, testInfo) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy|Refused to (execute|load|apply|connect)/i.test(message.text())) violations.push(message.text());
  });

  const home = await page.goto("/");
  const csp = home?.headers()["content-security-policy"] ?? "";
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  expect(nonce).toBeTruthy();
  expect(csp).toContain("frame-ancestors 'none'");
  expect(home?.headers()["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  // Every script tag in the server-rendered HTML carries this request's nonce. (Scripts that
  // those scripts add later are allowed by 'strict-dynamic' and need no nonce of their own.)
  const html = (await home?.text()) ?? "";
  const scriptTags = html.match(/<script\b[^>]*>/g) ?? [];
  expect(scriptTags.length).toBeGreaterThan(0);
  expect(scriptTags.filter((tag) => !tag.includes(`nonce="${nonce}"`))).toEqual([]);

  // A second request gets a different nonce.
  const again = await page.request.get("/");
  expect(again.headers()["content-security-policy"]).not.toContain(`'nonce-${nonce}'`);

  await signUpAndVerify(page, `csp-${testInfo.project.name}@example.com`);
  for (const path of ["/dashboard", "/properties/new", "/documents", "/billing", "/account", "/pricing"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
  }
  // Client-side navigation and hydration still work under the policy.
  await page.goto("/dashboard");
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Properties" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Properties" })).toBeVisible();
  expect(violations).toEqual([]);
});
