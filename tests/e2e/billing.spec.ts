import Stripe from "stripe";
import { expect, test } from "./fixtures";
import { FAKE_STRIPE_PORT } from "./fake-stripe-server";
import { signUpAndVerify } from "./helpers";

const FAKE = `http://localhost:${FAKE_STRIPE_PORT}`;
const signer = new Stripe("sk_test_offline").webhooks;

async function addProperty(page: import("@playwright/test").Page, street: string) {
  await page.goto("/properties/new");
  await page.getByLabel("Street address").fill(street);
  await page.getByLabel("Suburb").fill("Narre Warren");
  await page.getByLabel("State or territory").selectOption("VIC");
  await page.getByLabel("Postcode").fill("3805");
  await page.getByRole("button", { name: "Add property" }).click();
  await expect(page.getByRole("heading", { name: "Review compliance dates" })).toBeVisible();
}

test("trial limit, Stripe Checkout, webhook activation and a duplicate webhook (scenarios 8 and 9)", async ({ page }, testInfo) => {
  await signUpAndVerify(page, `billing-${testInfo.project.name}@example.com`);
  await addProperty(page, "12 Smith Street");

  // The trial allows 1 active property.
  await page.goto("/properties/new");
  await expect(page.getByText("Your plan allows 1 active property.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add property" })).toHaveCount(0);

  // Choose Portfolio: the app creates a Stripe Checkout session and redirects to it.
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Billing" }).click();
  await expect(page.getByText("Free trial")).toBeVisible();
  await expect(page.getByText("1 of 1")).toBeVisible();
  await page.getByRole("button", { name: "Choose Portfolio plan" }).click();
  await expect(page.getByText("Payment received. Your plan updates in a moment.")).toBeVisible();

  // Stripe confirms payment by webhook.
  const userId = await page.evaluate(async () => (await (await fetch("/api/auth/get-session")).json()).user.id as string);
  const [session] = await (await page.request.get(`${FAKE}/__sessions?user=${userId}`)).json();
  expect(session.price).toBe("price_portfolio");
  const subscriptionId = `sub_${testInfo.testId}`.replace(/[^\w]/g, "_");
  await page.request.post(`${FAKE}/__subscriptions`, { data: { id: subscriptionId, customer: session.customer, status: "active", price: "price_portfolio" } });

  const payload = JSON.stringify({
    id: `evt_${subscriptionId}`,
    object: "event",
    type: "checkout.session.completed",
    api_version: "2026-08-26.dahlia",
    created: 1_790_000_000,
    data: { object: { id: session.id, object: "checkout.session", client_reference_id: userId, metadata: { userId }, customer: session.customer, subscription: subscriptionId } },
  });
  const signature = await signer.generateTestHeaderStringAsync({ payload, secret: "whsec_e2e_secret" });
  const post = () => page.request.post("/api/webhooks/stripe", { data: payload, headers: { "stripe-signature": signature, "content-type": "application/json" } });

  const first = await post();
  expect(first.status()).toBe(200);
  expect(await first.text()).toBe("OK");
  const duplicate = await post();
  expect(duplicate.status()).toBe(200);
  expect(await duplicate.text()).toBe("Duplicate");

  const forged = await page.request.post("/api/webhooks/stripe", { data: payload, headers: { "stripe-signature": "t=1,v1=forged" } });
  expect(forged.status()).toBe(400);

  // Plan active, limit raised.
  await page.reload();
  await expect(page.getByText("Portfolio", { exact: true })).toBeVisible();
  await expect(page.getByText("1 of 5")).toBeVisible();
  await expect(page.getByRole("button", { name: "Manage billing" })).toBeVisible();
  await addProperty(page, "4 Sample Road");
});
