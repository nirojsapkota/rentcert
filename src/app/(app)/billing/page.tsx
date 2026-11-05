import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getEntitlement } from "@/server/billing/entitlements";
import { PLAN_DETAILS, PROPERTY_LIMITS } from "@/server/billing/plans";
import { countActiveProperties } from "@/server/properties/queries";
import { requireUser } from "@/server/session";
import { changePlanAction, checkoutAction, portalAction } from "./actions";

export const metadata: Metadata = { title: "Billing" };

const PLAN_NAMES = { TRIAL: "Free trial", PROPERTY: "Single Property", PORTFOLIO: "Portfolio", READ_ONLY: "Trial ended" } as const;

export default async function BillingPage({ searchParams }: PageProps<"/billing">) {
  const query = await searchParams;
  const user = await requireUser();
  const [entitlement, activeCount] = await Promise.all([getEntitlement(user.id), countActiveProperties(user.id)]);
  const timeZone = user.timezone ?? "Australia/Melbourne";
  const date = (value: Date) => value.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone });
  const subscription = entitlement.subscription;

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold text-deep">Billing</h1>

      {query.checkout === "success" && !subscription && (
        <Alert tone="success">Payment received. Your plan updates in a moment. Refresh this page if it doesn&apos;t.</Alert>
      )}
      {query.checkout === "success" && subscription && <Alert tone="success">Your {PLAN_DETAILS[subscription.plan].name} plan is active.</Alert>}
      {query.plan === "changed" && <Alert tone="success">Plan change confirmed. Your plan updates in a moment. Refresh this page if it doesn&apos;t.</Alert>}
      {query.error === "too_many_properties" && (
        <Alert tone="error">The Single Property plan covers 1 active property. Archive the others before you switch.</Alert>
      )}
      {query.error && query.error !== "too_many_properties" && (
        <Alert tone="error">We couldn&apos;t reach our payment provider. Please try again in a few minutes.</Alert>
      )}

      <div className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-xl font-bold">Current plan</h2>
        <p className="mt-2 text-2xl font-bold">{PLAN_NAMES[entitlement.plan]}</p>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Active properties</dt>
            <dd>
              {activeCount} of {entitlement.propertyLimit}
            </dd>
          </div>
          {entitlement.plan === "TRIAL" && (
            <div>
              <dt className="text-ink-muted">Trial ends</dt>
              <dd>{date(entitlement.trialEndsAt)}</dd>
            </div>
          )}
          {subscription && (
            <div>
              <dt className="text-ink-muted">Status</dt>
              <dd>
                {subscription.status === "past_due"
                  ? "Payment failed. Stripe will retry. Update your card in Manage billing."
                  : subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd
                    ? `Cancels on ${date(subscription.currentPeriodEnd)}`
                    : subscription.currentPeriodEnd
                      ? `Renews on ${date(subscription.currentPeriodEnd)}`
                      : "Active"}
              </dd>
            </div>
          )}
        </dl>
        {entitlement.plan === "READ_ONLY" && (
          <p className="mt-4 text-sm">
            Your free trial has ended. You can still view and download your records. Choose a plan to add properties,
            record checks and receive reminders again.
          </p>
        )}
        {subscription && (
          <form action={portalAction} className="mt-4">
            <Button type="submit" variant="secondary">
              Manage billing
            </Button>
          </form>
        )}
      </div>

      {subscription && !subscription.cancelAtPeriodEnd && <PlanSwitch current={subscription.plan} activeCount={activeCount} />}

      {!subscription && (
        <ul className="grid gap-4 md:grid-cols-2">
          {(["PROPERTY", "PORTFOLIO"] as const).map((plan) => (
            <li key={plan} className="flex flex-col rounded-lg border border-line bg-surface p-6">
              <h2 className="text-xl font-bold">{PLAN_DETAILS[plan].name}</h2>
              <p className="mt-2">
                <span className="font-mono text-3xl font-semibold">{PLAN_DETAILS[plan].price}</span>
                <span className="text-ink-muted"> AUD / month, incl. GST</span>
              </p>
              <p className="mt-1 text-ink-muted">{PLAN_DETAILS[plan].properties}</p>
              {entitlement.plan === "TRIAL" && (
                <p className="mt-2 text-sm text-ink-muted">You won&apos;t be charged until your trial ends on {date(entitlement.trialEndsAt)}.</p>
              )}
              <form action={checkoutAction.bind(null, plan)} className="mt-auto pt-4">
                <Button type="submit" className="w-full" aria-label={`Choose ${PLAN_DETAILS[plan].name} plan`}>
                  Choose plan
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-ink-muted">Payments are processed by Stripe. RentCert never sees your card details.</p>
    </section>
  );
}

// Offers the other plan. A downgrade is blocked while more properties are active than it allows.
function PlanSwitch({ current, activeCount }: { current: "PROPERTY" | "PORTFOLIO"; activeCount: number }) {
  const other = current === "PROPERTY" ? "PORTFOLIO" : "PROPERTY";
  const blocked = activeCount > PROPERTY_LIMITS[other];
  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <h2 className="text-xl font-bold">Switch to {PLAN_DETAILS[other].name}</h2>
      <p className="mt-2">
        <span className="font-mono text-2xl font-semibold">{PLAN_DETAILS[other].price}</span>
        <span className="text-ink-muted"> AUD / month, incl. GST · {PLAN_DETAILS[other].properties}</span>
      </p>
      <p className="mt-2 text-sm text-ink-muted">Stripe shows the adjusted amount before you confirm. The difference for the current month is prorated.</p>
      {blocked && <p className="mt-2 text-sm">You have {activeCount} active properties. Archive all but 1 before you switch.</p>}
      <form action={changePlanAction.bind(null, other)} className="mt-4">
        <Button type="submit" variant={other === "PORTFOLIO" ? "primary" : "secondary"} disabled={blocked}>
          Switch to {PLAN_DETAILS[other].name}
        </Button>
      </form>
    </div>
  );
}
