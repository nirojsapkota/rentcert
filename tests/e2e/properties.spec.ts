import { expect, newUserPage, test } from "./fixtures";
import { expectNoHorizontalOverflow, signUpAndVerify } from "./helpers";

test("landlord adds, edits, archives, restores and deletes a property", async ({ page }, testInfo) => {
  await signUpAndVerify(page, `owner-${testInfo.project.name}@example.com`);

  await expect(page.getByRole("heading", { name: "Add your first property" })).toBeVisible();
  await page.getByRole("link", { name: "Add property" }).click();
  await expect(page.getByRole("heading", { name: "Tell us about your first property" })).toBeVisible();

  // Invalid input keeps the entered values and shows field errors.
  await page.getByLabel("Street address").fill("12 Example Street");
  await page.getByLabel("Suburb").fill("Parramatta");
  await page.getByLabel("State or territory").selectOption("NSW");
  await page.getByLabel("Postcode").fill("123");
  await page.getByRole("button", { name: "Add property" }).click();
  await expect(page.getByText("Enter a 4-digit Australian postcode.")).toBeVisible();
  await expect(page.getByLabel("Street address")).toHaveValue("12 Example Street");
  await expect(page.getByLabel("State or territory")).toHaveValue("NSW");

  await page.getByLabel("Postcode").fill("2150");
  await page.getByLabel("Lease start date (optional)").fill("2024-10-12");
  await page.getByRole("button", { name: "Add property" }).click();
  // New properties go to compliance setup first; skip it for this test.
  await expect(page.getByRole("heading", { name: "Review compliance dates" })).toBeVisible();
  await page.goto(page.url().replace(/\/setup$/, ""));
  await expect(page.getByRole("heading", { level: 1, name: "12 Example Street" })).toBeVisible();
  await expect(page.getByText("Parramatta NSW 2150").first()).toBeVisible();
  await expect(page.getByText("12 October 2024")).toBeVisible();

  // Edit.
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: /^Edit/ })).toBeVisible();
  await page.getByLabel("Nickname (optional)").fill("Parramatta house");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Your changes have been saved.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Parramatta house" })).toBeVisible();

  // Archive, then find it under Archived and restore.
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("This property is archived.")).toBeVisible();
  await page.getByRole("link", { name: "← All properties" }).click();
  await expect(page.getByRole("link", { name: "Archived" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: /Parramatta house/ }).click();
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByText("This property is archived.")).toBeHidden();

  // Dashboard count.
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByRole("link", { name: /1\s*Property/ })).toBeVisible();

  // Delete.
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Properties" }).click();
  await page.getByRole("link", { name: /Parramatta house/ }).click();
  await page.getByText("Delete this property…").click();
  await page.getByRole("button", { name: "Yes, delete Parramatta house" }).click();
  await expect(page.getByText("The property has been deleted.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Add your first property" })).toBeVisible();
});

test("another user's property returns 404 with no data (scenario 5)", async ({ browser }, testInfo) => {
  const owner = await newUserPage(browser, testInfo, "owner");
  await signUpAndVerify(owner, `alice-${testInfo.project.name}@example.com`, "Alice");
  await owner.goto("/properties/new");
  await owner.getByLabel("Street address").fill("99 Private Lane");
  await owner.getByLabel("Suburb").fill("Hobart");
  await owner.getByLabel("State or territory").selectOption("TAS");
  await owner.getByLabel("Postcode").fill("7000");
  await owner.getByRole("button", { name: "Add property" }).click();
  await expect(owner.getByRole("heading", { name: "Review compliance dates" })).toBeVisible();
  const propertyUrl = new URL(owner.url()).pathname.replace(/\/setup$/, "");

  const intruder = await newUserPage(browser, testInfo, "intruder");
  await signUpAndVerify(intruder, `bob-${testInfo.project.name}@example.com`, "Bob");
  for (const path of [propertyUrl, `${propertyUrl}/edit`, `${propertyUrl}/setup`, `${propertyUrl}/checks/gas/complete`]) {
    const response = await intruder.goto(path);
    expect(response?.status()).toBe(404);
    await expect(intruder.getByRole("heading", { name: "Page not found" })).toBeVisible();
    expect(await intruder.content()).not.toContain("99 Private Lane");
  }
  await intruder.goto("/properties");
  await expect(intruder.getByText("99 Private Lane")).toHaveCount(0);
});

test("address search fills the address fields, and typing by hand still works", async ({ page }, testInfo) => {
  await signUpAndVerify(page, `address-${testInfo.project.name}@example.com`);
  await page.route("**/api/address-search?**", (route) =>
    route.fulfill({
      json: {
        suggestions: [
          { label: "2 Charmouth Place, Narre Warren South VIC 3805, Australia", addressLine1: "2 Charmouth Place", suburb: "Narre Warren South", state: "VIC", postcode: "3805" },
          { label: "2 Charmouth Road, Perth WA 6000, Australia", addressLine1: "2 Charmouth Road", suburb: "Perth", state: "WA", postcode: "6000" },
        ],
      },
    }),
  );
  await page.goto("/properties/new");
  const street = page.getByRole("combobox", { name: "Street address" });
  await street.fill("2 Charmouth");
  const options = page.getByRole("listbox", { name: "Address suggestions" }).getByRole("option");
  await expect(options).toHaveCount(2);
  await expectNoHorizontalOverflow(page);

  // Keyboard: down, down, up, Enter picks the first suggestion.
  await street.press("ArrowDown");
  await street.press("ArrowDown");
  await street.press("ArrowUp");
  await street.press("Enter");
  await expect(street).toHaveValue("2 Charmouth Place");
  await expect(page.getByLabel("Suburb")).toHaveValue("Narre Warren South");
  await expect(page.getByLabel("State or territory")).toHaveValue("VIC");
  await expect(page.getByLabel("Postcode")).toHaveValue("3805");
  await expect(page.getByText("Address search by")).toBeVisible();

  // The fields stay editable: add a unit number and save.
  await street.fill("Unit 4, 2 Charmouth Place");
  await page.getByRole("button", { name: "Add property" }).click();
  await expect(page.getByRole("heading", { name: "Review compliance dates" })).toBeVisible();
  await expect(page.getByText("Unit 4, 2 Charmouth Place")).toBeVisible();
});
