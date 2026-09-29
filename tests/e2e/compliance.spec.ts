import { expect, test } from "./fixtures";
import { expectNoHorizontalOverflow, signUpAndVerify } from "./helpers";

function isoDate(offsetDays: number) {
  // Dates in the test are relative to Melbourne "today", which is what the app uses.
  const now = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(now);
}

test("landlord sets up checks, records a gas check and sees the dashboard (scenarios 2 and 3)", async ({ page }, testInfo) => {
  await signUpAndVerify(page, `compliance-${testInfo.project.name}@example.com`);

  await page.goto("/properties/new");
  await page.getByLabel("Street address").fill("12 Example Street");
  await page.getByLabel("Suburb").fill("Narre Warren");
  await page.getByLabel("State or territory").selectOption("VIC");
  await page.getByLabel("Postcode").fill("3805");
  await page.getByRole("button", { name: "Add property" }).click();

  // Step 3 of onboarding: review compliance dates.
  await expect(page.getByRole("heading", { name: "Review compliance dates" })).toBeVisible();
  await expect(page.getByText("RentCert uses the dates you provide to calculate reminders.")).toBeVisible();

  const smoke = page.getByRole("group", { name: "Smoke alarm check" });
  await smoke.getByLabel("Smoke alarm check: last check date").fill(isoDate(-350)); // due in about 15 days
  await page.getByRole("group", { name: "Electrical safety check" }).getByLabel(/I don't know/).check();
  const gas = page.getByRole("group", { name: "Gas safety check" });
  await gas.getByLabel("Gas safety check: last check date").fill(isoDate(-760)); // overdue
  await page.getByRole("button", { name: "Save and review dates" }).click();

  await expect(page.getByText("Based on the dates you entered")).toBeVisible();
  await expect(page.getByText("not legal advice")).toBeVisible();
  const cards = page.getByRole("region", { name: "Compliance" });
  await expect(cards.getByText(/Due in \d+ days/)).toBeVisible();
  await expect(cards.getByText("Due today")).toBeVisible();
  await expect(cards.getByText(/Overdue by \d+ days/)).toBeVisible();
  await expect(cards.getByText("Not yet verified.").first()).toBeVisible();

  // Scenario 3: mark gas completed.
  await page.getByRole("link", { name: "Mark gas safety check completed" }).click();
  await expect(page.getByRole("heading", { name: "Mark gas safety check completed" })).toBeVisible();
  await page.getByLabel("Completed date").fill(isoDate(1));
  await page.getByRole("button", { name: "Save completed check" }).click();
  await expect(page.getByText("The date can't be in the future.")).toBeVisible();

  await page.getByLabel("Completed date").fill(isoDate(0));
  await page.getByLabel("Provider (optional)").fill("ABC Safety");
  await page.getByLabel("Provider licence number (optional)").fill("GF-1234");
  await page.getByRole("button", { name: "Save completed check" }).click();
  await expect(page.getByText(/Gas safety check saved\. Next due:/)).toBeVisible();

  const history = page.getByRole("region", { name: "Compliance history" });
  // Header + smoke + electrical (unknown) + gas (setup) + gas (new).
  await expect(history.getByRole("row")).toHaveCount(5);
  await expect(history.getByText("ABC Safety")).toBeVisible();
  await expect(history.getByText("Last check unknown")).toBeVisible();
  await page.reload();
  await expectNoHorizontalOverflow(page);

  // Deleting is refused once there is history.
  await page.getByText("Delete this property…").click();
  await page.getByRole("button", { name: /Yes, delete/ }).click();
  await expect(page.getByText("This property has compliance history, so it can't be deleted.")).toBeVisible();

  // Dashboard.
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Upcoming deadlines" })).toBeVisible();
  // Smoke alarm (due in about 15 days) and electrical (due today) both count as due soon.
  await expect(page.getByRole("link", { name: /2\s*Due soon/ })).toBeVisible();
  await page.reload();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("link", { name: "Completed", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Completed checks (last 12 months)" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Gas safety check" })).toBeVisible();
  await page.reload();
  await expectNoHorizontalOverflow(page);
});

test("an NSW property uses the NSW schedule, labelled by basis", async ({ page }, testInfo) => {
  await signUpAndVerify(page, `nsw-${testInfo.project.name}@example.com`);
  await page.goto("/properties/new");
  await page.getByLabel("Street address").fill("8 Placeholder Avenue");
  await page.getByLabel("Suburb").fill("Parramatta");
  await page.getByLabel("State or territory").selectOption("NSW");
  await page.getByLabel("Postcode").fill("2150");
  await page.getByRole("button", { name: "Add property" }).click();

  await expect(page.getByRole("heading", { name: "Review compliance dates" })).toBeVisible();
  await expect(page.getByText("RentCert has not yet researched")).toHaveCount(0);
  await page.getByRole("group", { name: "Gas safety check" }).getByLabel("Not applicable to this property").check();
  await page.getByRole("group", { name: "Smoke alarm check" }).getByLabel(/I don't know/).check();
  await page.getByRole("group", { name: "Electrical safety check" }).getByLabel(/I don't know/).check();
  await page.getByRole("button", { name: "Save and review dates" }).click();

  await expect(page.getByText("Required every year in NSW.")).toBeVisible();
  await expect(page.getByText("Recommended every 2 years. Not a fixed legal interval in NSW.").first()).toBeVisible();
  await expect(page.getByText("Not yet verified.").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "This check applies" })).toBeVisible();
  const body = await page.locator("main").innerText();
  expect(body).not.toMatch(/\bcompliant\b/i);
});

test("an owner with VIC and QLD properties sees each state's own checks", async ({ page }, testInfo) => {
  await signUpAndVerify(page, `states-${testInfo.project.name}@example.com`);
  await page.goto("/properties/new");
  await page.getByLabel("Street address").fill("3 Queen Street");
  await page.getByLabel("Suburb").fill("Brisbane");
  await page.getByLabel("State or territory").selectOption("QLD");
  await page.getByLabel("Postcode").fill("4000");
  await page.getByRole("button", { name: "Add property" }).click();
  await expect(page.getByRole("heading", { name: "Review compliance dates" })).toBeVisible();
  await expect(page.getByText("within 30 days before each new or renewed tenancy")).toBeVisible();
  for (const check of ["Smoke alarm check", "Electrical safety check", "Gas safety check"]) {
    await page.getByRole("group", { name: check }).getByLabel(/I don't know/).check();
  }
  await page.getByRole("button", { name: "Save and review dates" }).click();

  const cards = page.getByRole("region", { name: "Compliance" });
  await expect(cards.getByText("Required before each new or renewed tenancy in QLD. RentCert reminds you every year.")).toBeVisible();
  await expect(cards.getByText("Recommended every 2 years. Not a fixed legal interval in QLD.")).toHaveCount(2);
  await expect(cards.getByRole("link", { name: "Residential Tenancies Authority (QLD): Smoke alarms" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
