import { afterEach, describe, expect, it, vi } from "vitest";
import { getEntitlement } from "@/server/billing/entitlements";
import { cancelSubscriptionsForUser, startCheckout } from "@/server/billing/checkout";
import { handleStripeWebhook } from "@/server/billing/webhook";
import { recordCompletion, setUpChecks } from "@/server/compliance/commands";
import { getPropertySchedule } from "@/server/compliance/queries";
import { loadCompliancePack } from "@/server/compliance-pack/load";
import { db } from "@/server/db";
import { archiveProperty, createProperty, restoreProperty } from "@/server/properties/commands";
import { scanDueReminders } from "@/server/reminders/scan";
import { uploadDocument } from "@/server/vault/commands";
import { callAuth, createVerifiedUser, signUp, VALID_PASSWORD } from "../support/auth-http";
import { createUser, insertProperty, propertyInput, subscribe } from "../support/factories";
import { fakeStripe, signedEvent } from "../support/fake-stripe";
import { pdfBytes } from "../support/files";

const DAY = 86_400_000;

afterEach(() => vi.unstubAllEnvs());

async function expireTrial(userId: string) {
  await db.user.update({ where: { id: userId }, data: { trialEndsAt: new Date(Date.now() - DAY) } });
}

describe("entitlements", () => {
  it.each([
    ["an account in its trial", async () => undefined, { plan: "TRIAL", propertyLimit: 1, canWrite: true }],
    ["an account whose trial ended", expireTrial, { plan: "READ_ONLY", propertyLimit: 0, canWrite: false }],
    ["a Property subscription", (id: string) => subscribe(id, "PROPERTY"), { plan: "PROPERTY", propertyLimit: 1, canWrite: true }],
    ["a Portfolio subscription", (id: string) => subscribe(id, "PORTFOLIO"), { plan: "PORTFOLIO", propertyLimit: 5, canWrite: true }],
    ["a past-due Portfolio after the trial", async (id: string) => { await expireTrial(id); await subscribe(id, "PORTFOLIO", "past_due"); }, { plan: "PORTFOLIO", propertyLimit: 5, canWrite: true }],
    ["a cancelled subscription after the trial", async (id: string) => { await expireTrial(id); await subscribe(id, "PORTFOLIO", "canceled"); }, { plan: "READ_ONLY", propertyLimit: 0, canWrite: false }],
    ["an unpaid subscription during the trial", (id: string) => subscribe(id, "PORTFOLIO", "unpaid"), { plan: "TRIAL", propertyLimit: 1, canWrite: true }],
  ])("%s", async (_name, arrange, expected) => {
    const user = await createUser();
    await arrange(user.id);
    expect(await getEntitlement(user.id)).toMatchObject(expected);
  });

  it("sets a new account's trial from the trial_days setting", async () => {
    await db.appSetting.update({ where: { key: "trial_days" }, data: { value: 30 } });
    try {
      await signUp({ email: "short-trial@example.com" });
      const user = await db.user.findUniqueOrThrow({ where: { email: "short-trial@example.com" } });
      const days = (user.trialEndsAt.getTime() - Date.now()) / DAY;
      expect(days).toBeGreaterThan(29.9);
      expect(days).toBeLessThan(30.1);
    } finally {
      await db.appSetting.update({ where: { key: "trial_days" }, data: { value: 365 } });
    }
  });
});

describe("trial tampering", () => {
  it("ignores a trial end date sent by the client at sign-up", async () => {
    const response = await callAuth("/sign-up/email", {
      body: { email: "sneaky@example.com", password: VALID_PASSWORD, name: "S N", firstName: "S", lastName: "N", trialEndsAt: "2099-01-01T00:00:00Z" },
    });
    const user = await db.user.findUnique({ where: { email: "sneaky@example.com" } });

    if (user) expect(user.trialEndsAt.getFullYear()).toBeLessThan(2099);
    else expect(response.status).toBe(400);
  });
});

describe("property limits (enforced on the server)", () => {
  it("allows 1 active property in the trial; archived properties don't count", async () => {
    const user = await createUser();
    const first = await createProperty(user.id, propertyInput());
    expect(first.ok).toBe(true);
    expect(await createProperty(user.id, propertyInput())).toEqual({ ok: false, reason: "limit_reached" });

    if (!first.ok) throw new Error("unreachable");
    await archiveProperty(user.id, first.property.id);
    const second = await createProperty(user.id, propertyInput({ addressLine1: "4 Sample Road" }));
    expect(second.ok).toBe(true);
    expect(await restoreProperty(user.id, first.property.id)).toBe("limit_reached");
  });

  it("allows 5 on Portfolio and blocks the 6th", async () => {
    const user = await createUser();
    await subscribe(user.id, "PORTFOLIO");
    for (let i = 0; i < 5; i++) expect((await createProperty(user.id, propertyInput())).ok).toBe(true);
    expect(await createProperty(user.id, propertyInput())).toEqual({ ok: false, reason: "limit_reached" });
  });

  it("lets only one of two simultaneous creates take the last slot", async () => {
    const user = await createUser();
    const results = await Promise.all([createProperty(user.id, propertyInput()), createProperty(user.id, propertyInput())]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(await db.property.count({ where: { userId: user.id } })).toBe(1);
  });

  it("keeps everything after a downgrade, but blocks adding until under the limit", async () => {
    const user = await createUser();
    for (let i = 0; i < 3; i++) await insertProperty(user.id);
    await subscribe(user.id, "PROPERTY");

    expect(await db.property.count({ where: { userId: user.id, archivedAt: null } })).toBe(3);
    expect(await createProperty(user.id, propertyInput())).toEqual({ ok: false, reason: "limit_reached" });
  });
});

describe("read-only after the trial", () => {
  it("blocks new data but keeps reading, packs and downloads available", async () => {
    const user = await createUser();
    const property = await insertProperty(user.id);
    const done = await recordCompletion(user.id, property.id, "gas", { completedOn: "2026-09-01", providerName: null, providerLicenceNumber: null, notes: null });
    if (!done.ok) throw new Error("setup failed");
    await expireTrial(user.id);

    expect(await createProperty(user.id, propertyInput())).toEqual({ ok: false, reason: "limit_reached" });
    expect(await recordCompletion(user.id, property.id, "gas", { completedOn: "2026-09-02", providerName: null, providerLicenceNumber: null, notes: null })).toEqual({ ok: false, reason: "read_only" });
    expect(await setUpChecks(user.id, property.id, "2026-09-23", { smoke_alarm: { choice: "unknown" } })).toEqual({ ok: false, reason: "read_only" });
    expect(await uploadDocument(user.id, property.id, done.recordId, { name: "x.pdf", bytes: pdfBytes() })).toMatchObject({ ok: false, reason: "invalid" });

    expect(await getPropertySchedule(user.id, property.id, "2026-09-23")).not.toBeNull();
    expect(await loadCompliancePack(user.id, property.id, "Australia/Melbourne")).not.toBeNull();
  });

  it("pauses reminders", async () => {
    const user = await createUser();
    const property = await insertProperty(user.id);
    const done = await recordCompletion(user.id, property.id, "gas", { completedOn: "2024-01-01", providerName: null, providerLicenceNumber: null, notes: null });
    if (!done.ok) throw new Error("setup failed");
    await db.complianceRecord.update({ where: { id: done.recordId }, data: { createdAt: new Date("2024-01-01T00:00:00Z") } });

    await expireTrial(user.id);
    expect(await scanDueReminders()).toEqual([]);
    await subscribe(user.id, "PROPERTY");
    expect(await scanDueReminders()).toHaveLength(1);
  });
});

describe("Stripe webhook", () => {
  async function checkoutCompleted(userId: string, stripe: ReturnType<typeof fakeStripe>, plan = "price_portfolio", eventId = "evt_checkout") {
    stripe.subscriptions.set("sub_1", { customer: "cus_1", status: "active", price: plan });
    return signedEvent({
      id: eventId,
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", object: "checkout.session", client_reference_id: userId, metadata: { userId }, customer: "cus_1", subscription: "sub_1" } },
    });
  }

  it("rejects missing and invalid signatures without changing anything", async () => {
    const stripe = fakeStripe();
    const user = await createUser();
    const { payload } = await checkoutCompleted(user.id, stripe);

    expect(await handleStripeWebhook(payload, null, stripe.client)).toMatchObject({ status: 400 });
    expect(await handleStripeWebhook(payload, "t=1,v1=forged", stripe.client)).toMatchObject({ status: 400 });
    expect(await handleStripeWebhook(`${payload} `, (await signedEvent(JSON.parse(payload))).signature.replace(/v1=\w/, "v1=0"), stripe.client)).toMatchObject({ status: 400 });
    expect(await db.stripeEvent.count()).toBe(0);
    expect(await db.subscription.count()).toBe(0);
  });

  it("activates a subscription and raises the property limit (scenario 8)", async () => {
    const stripe = fakeStripe();
    const user = await createUser();
    const { payload, signature } = await checkoutCompleted(user.id, stripe);

    expect(await handleStripeWebhook(payload, signature, stripe.client)).toEqual({ status: 200, body: "OK" });

    expect(await getEntitlement(user.id)).toMatchObject({ plan: "PORTFOLIO", propertyLimit: 5 });
    expect(await db.billingAccount.findUniqueOrThrow({ where: { userId: user.id } })).toMatchObject({ stripeCustomerId: "cus_1" });
    expect(await db.auditEvent.count({ where: { userId: user.id, action: "billing.subscription_changed" } })).toBe(1);
  });

  it("ignores a duplicate delivery of the same event (scenario 9)", async () => {
    const stripe = fakeStripe();
    const user = await createUser();
    const { payload, signature } = await checkoutCompleted(user.id, stripe);

    await handleStripeWebhook(payload, signature, stripe.client);
    expect(await handleStripeWebhook(payload, signature, stripe.client)).toEqual({ status: 200, body: "Duplicate" });

    expect(await db.subscription.count()).toBe(1);
    expect(await db.stripeEvent.count()).toBe(1);
    expect(await db.auditEvent.count({ where: { action: "billing.subscription_changed" } })).toBe(1);
  });

  it("handles simultaneous duplicate deliveries once", async () => {
    const stripe = fakeStripe();
    const user = await createUser();
    const { payload, signature } = await checkoutCompleted(user.id, stripe);

    const results = await Promise.all([handleStripeWebhook(payload, signature, stripe.client), handleStripeWebhook(payload, signature, stripe.client)]);
    expect(results.map((result) => result.status)).toEqual([200, 200]);
    expect(await db.subscription.count()).toBe(1);
  });

  it("follows cancellation and failed payment, using the current state from Stripe", async () => {
    const stripe = fakeStripe();
    const user = await createUser();
    const first = await checkoutCompleted(user.id, stripe);
    await handleStripeWebhook(first.payload, first.signature, stripe.client);

    // Failed payment: past_due keeps access.
    stripe.subscriptions.set("sub_1", { customer: "cus_1", status: "past_due", price: "price_portfolio" });
    const failed = await signedEvent({ id: "evt_failed", type: "invoice.payment_failed", data: { object: { id: "in_1", object: "invoice", parent: { subscription_details: { subscription: "sub_1" } } } } });
    await handleStripeWebhook(failed.payload, failed.signature, stripe.client);
    expect(await getEntitlement(user.id)).toMatchObject({ plan: "PORTFOLIO", subscription: { status: "past_due" } });

    // Cancelled in Stripe. An older "updated" event arriving late still reads the current state.
    stripe.subscriptions.set("sub_1", { customer: "cus_1", status: "canceled", price: "price_portfolio" });
    const deleted = await signedEvent({ id: "evt_deleted", type: "customer.subscription.deleted", data: { object: { id: "sub_1", object: "subscription" } } });
    const lateUpdate = await signedEvent({ id: "evt_old_update", type: "customer.subscription.updated", data: { object: { id: "sub_1", object: "subscription", status: "active" } } });
    await handleStripeWebhook(deleted.payload, deleted.signature, stripe.client);
    await handleStripeWebhook(lateUpdate.payload, lateUpdate.signature, stripe.client);

    expect(await getEntitlement(user.id)).toMatchObject({ plan: "TRIAL", propertyLimit: 1, subscription: null });
  });

  it("returns 500 and records nothing when Stripe cannot be reached, so Stripe retries", async () => {
    const stripe = fakeStripe();
    const user = await createUser();
    const { payload, signature } = await checkoutCompleted(user.id, stripe);
    stripe.mocks.subscriptions.retrieve.mockRejectedValueOnce(new Error("network"));

    await expect(handleStripeWebhook(payload, signature, stripe.client)).rejects.toThrow("network");
    expect(await db.stripeEvent.count()).toBe(0);
    expect((await handleStripeWebhook(payload, signature, stripe.client)).status).toBe(200);
  });
});

describe("Checkout", () => {
  it("creates one customer and keeps the rest of the trial", async () => {
    const stripe = fakeStripe();
    const user = await createUser();

    expect(await startCheckout(user.id, "PORTFOLIO", stripe.client)).toBe("https://checkout.stripe.test/cs_test");
    await startCheckout(user.id, "PROPERTY", stripe.client);

    expect(stripe.mocks.customers.create).toHaveBeenCalledTimes(1);
    const params = stripe.mocks.checkout.sessions.create.mock.calls[0][0] as unknown as Record<string, unknown> & { subscription_data: { trial_end?: number }; line_items: { price: string }[] };
    expect(params).toMatchObject({ mode: "subscription", client_reference_id: user.id, line_items: [{ price: "price_portfolio", quantity: 1 }] });
    expect(params.subscription_data.trial_end).toBeGreaterThan(Date.now() / 1000 + 300 * 86_400);
    expect(await db.auditEvent.count({ where: { userId: user.id, action: "billing.checkout_started" } })).toBe(2);
  });

  it("starts billing immediately when less than 48 hours of trial remain", async () => {
    const stripe = fakeStripe();
    const user = await createUser();
    await db.user.update({ where: { id: user.id }, data: { trialEndsAt: new Date(Date.now() + DAY) } });

    await startCheckout(user.id, "PROPERTY", stripe.client);

    const params = stripe.mocks.checkout.sessions.create.mock.calls[0][0] as unknown as { subscription_data: { trial_end?: number } };
    expect(params.subscription_data.trial_end).toBeUndefined();
  });
});

describe("account deletion", () => {
  it("cancels active subscriptions without a refund", async () => {
    const stripe = fakeStripe();
    const user = await createUser();
    const subscription = await subscribe(user.id, "PORTFOLIO");
    await subscribe(user.id, "PROPERTY", "canceled");

    await cancelSubscriptionsForUser(user.id, stripe.client);

    expect(stripe.mocks.subscriptions.cancel).toHaveBeenCalledTimes(1);
    expect(stripe.mocks.subscriptions.cancel).toHaveBeenCalledWith(subscription.stripeSubscriptionId, { prorate: false });
  });

  it("refuses to delete the account when the subscription cannot be cancelled", async () => {
    const { cookie, userId } = await createVerifiedUser();
    await subscribe(userId, "PORTFOLIO");
    vi.stubEnv("STRIPE_SECRET_KEY", ""); // Stripe unreachable

    const response = await callAuth("/delete-user", { cookie, body: { password: VALID_PASSWORD } });

    expect(response.status).toBe(503);
    expect(await db.user.count({ where: { id: userId } })).toBe(1);
  });
});
