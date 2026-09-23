# Spec: billing (Phase 7)

Status: IMPLEMENTED (2026-09-23). Module id: `billing`. Depends on: `foundation`, `properties`.
Source: PLAN.md sections 18, 19, 20, 32, 41 (scenarios 8 and 9), 59. Owner decisions: trial
length is an admin setting (default 365 days); archived properties do not count toward limits.

Stack, commands, code style and boundaries from `SPEC-foundation.md` apply unchanged.

---

## Objective

Landlords start with a free trial, then subscribe through Stripe-hosted Checkout to the Property
plan ($9 AUD/month, 1 property) or the Portfolio plan ($19 AUD/month, up to 5 properties).
Stripe is the source of truth for payment state. Plan limits are enforced on the server.

## Proposed commercial model (needs your answers, see Open Questions)

- **In-app trial, no card:** every new account gets a trial (`trial_days` setting, default 365)
  with 1 active property. No Stripe involvement until the landlord chooses a plan.
- **Subscribing during the trial:** Checkout sets the Stripe subscription's `trial_end` to the
  account's trial end, so the first charge happens when the trial ends. Stripe needs `trial_end`
  at least 48 hours ahead; closer than that, billing starts immediately.
- **After the trial with no subscription (read-only):** the landlord can still view, download
  documents and packs, and export data. They cannot add or restore properties, record checks or
  upload files, and reminders stop. The dashboard says why and links to Billing.
- **Limits:** trial = 1 active property; Property plan = 1; Portfolio = 5. Archived properties
  don't count. More than 5 is not offered in the MVP.
- **Downgrade over the limit** (Portfolio with 4 active properties moves to Property): nothing
  is deleted or archived automatically. Adding and restoring are blocked until the count is
  under the limit, with a message.
- **Past-due payment:** access continues while Stripe retries (`past_due`). `unpaid`, `canceled`
  and `incomplete_expired` end paid access; the account falls back to trial rules, or read-only
  if the trial has ended.
- **Prices:** AUD, GST-inclusive, without Stripe Tax in the MVP.

## Data model

```prisma
model BillingAccount {            // one per user
  id, userId (unique, FK cascade), stripeCustomerId (unique), createdAt
}
model Subscription {
  id, billingAccountId (FK cascade), stripeSubscriptionId (unique), plan (PROPERTY | PORTFOLIO),
  status (Stripe status string), currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd,
  trialEnd?, updatedAt
}
model StripeEvent {               // webhook idempotency
  id (Stripe event id, primary key), type, processedAt
}
model AppSetting {                // admin-managed settings (editing UI arrives in Phase 8)
  key (primary key), value (JSON), updatedAt
}
User.trialEndsAt DateTime         // set at sign-up from trial_days
```

The `trial_days` setting is seeded at 365 in a migration. Changing it affects new sign-ups only.

## Entitlements (one place)

`src/server/billing/entitlements.ts`:

```ts
getEntitlement(userId, now) → { plan: "TRIAL" | "PROPERTY" | "PORTFOLIO" | "READ_ONLY",
                                propertyLimit: number, canWrite: boolean, trialEndsAt, subscription? }
canAddProperty(userId) → boolean   // active properties < propertyLimit and canWrite
```

- `createProperty` and `restoreProperty` check `canAddProperty` inside the transaction and return
  `limit_reached` (the page shows the plan message). `recordCompletion`, `setUpChecks` and
  `uploadDocument` check `canWrite`. The reminder scan skips read-only accounts.
- The UI hides or disables actions from the same entitlement, but the server check is the rule.

## Stripe flows

- **Checkout:** a server action creates a Checkout Session (`mode: subscription`, price from
  `STRIPE_PRICE_PROPERTY` or `STRIPE_PRICE_PORTFOLIO`, the customer created or reused,
  `client_reference_id` and `metadata.userId`, and success and cancel URLs back to `/billing`).
  No card form is ever built in the app.
- **Manage or cancel:** the Stripe customer portal (hosted), opened from `/billing`.
- **Webhook** `POST /api/webhooks/stripe`:
  1. Verify the signature on the raw body with `STRIPE_WEBHOOK_SECRET`. A bad or missing
     signature returns 400 and changes nothing.
  2. Insert the event id into `stripe_events`. If it already exists, return 200 and do nothing (scenario 9).
  3. For `checkout.session.completed` and `customer.subscription.created`, `.updated` and
     `.deleted`, plus `invoice.payment_failed`: **retrieve the subscription from Stripe** and upsert
     it. Fetching the current state makes out-of-order events harmless.
  4. Steps 2 and 3 run in one transaction. If processing fails, the event row rolls back and
     Stripe retries.
- **Account deletion:** cancels any active subscription immediately (no refund) before deleting.
  The Stripe customer record stays in Stripe for tax records.
- Audit events: `billing.checkout_started`, `billing.subscription_changed` (plan and status only).

## Pages

- `/billing`: current plan and status, trial end date, "N of M active properties", plan cards
  ($9 and $19, GST-inclusive), "Choose plan" (Checkout) or "Manage billing" (portal). After
  Checkout: "Payment received. Your plan updates in a moment." until the webhook lands.
- Add property: at the limit, the button is replaced by the plan message and a link to Billing.
- Read-only banner in the app shell once the trial has ended without a subscription.

## Configuration

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PROPERTY`, `STRIPE_PRICE_PORTFOLIO`.
The publishable key is not needed with hosted Checkout. New dependency: `stripe` (named in PLAN.md).
Local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (Stripe CLI;
README explains it).

## Testing Strategy

- Unit: `getEntitlement` across trial, trial expired, each plan, each Stripe status, and a
  downgrade over the limit.
- Integration with a fake Stripe client (no network):
  - Signature valid, invalid and missing.
  - A duplicate event is a no-op (scenario 9).
  - Activation raises the limit (scenario 8), cancellation lowers it, and a failed payment
    becomes `past_due` and keeps access.
  - Out-of-order events converge.
  - The limit is enforced on create and restore, including concurrent creates.
  - Read-only blocks writes but allows reads, downloads and packs.
  - Checkout sets `trial_end` only when the trial ends more than 48 hours ahead.
  - Account deletion cancels the subscription.
- End to end: a trial user hits the 1-property limit. A signed test webhook (built with Stripe's
  test signature helper) activates Portfolio, and a second property can then be added. The
  billing page shows the plan.

## Success Criteria

- Scenarios 8 and 9 pass. Limits hold on the server whatever the UI shows.
- No card data touches the app. The webhook rejects unsigned requests.
- lint, typecheck, Vitest, Playwright, build and audit pass.

## Out of scope

Annual plans, coupons, more than 5 properties, Stripe Tax, invoices inside the app, the admin
UI for `trial_days` (Phase 8; until then it is a database setting).

## Open Questions

1. **What does an account get without a paid plan?** Proposed: a free trial (365 days, 1
   property, no card), then read-only. Alternative: free forever for 1 property, but then the
   $9 Property plan offers nothing extra.
2. **Card at trial start?** Proposed: no card; the landlord adds one when choosing a plan.
3. **After the trial without a plan:** read-only as described (view, download, export; no new
   data; no reminders). OK?
4. **GST:** prices shown and charged GST-inclusive, without Stripe Tax for now. OK? (Whether you
   must register for GST depends on turnover. Check with your accountant.)
5. **Account deletion** cancels the subscription immediately with no refund. OK?
