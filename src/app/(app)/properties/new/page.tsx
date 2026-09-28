import type { Metadata } from "next";
import Link from "next/link";
import { getEntitlement } from "@/server/billing/entitlements";
import { countActiveProperties } from "@/server/properties/queries";
import { requireUser } from "@/server/session";
import { createPropertyAction } from "../actions";
import { PropertyForm } from "../property-form";

export const metadata: Metadata = { title: "Add property" };

export default async function NewPropertyPage() {
  const user = await requireUser();
  const [activeCount, entitlement] = await Promise.all([countActiveProperties(user.id), getEntitlement(user.id)]);
  const isFirst = activeCount === 0;
  const atLimit = activeCount >= entitlement.propertyLimit;
  return (
    <section className="max-w-2xl">
      <h1 className="text-3xl font-bold text-deep">{isFirst ? "Tell us about your first property" : "Add property"}</h1>
      <div className="mt-6 rounded-lg border border-line bg-surface p-6">
        {atLimit ? (
          <p>
            {entitlement.canWrite
              ? `Your plan allows ${entitlement.propertyLimit} active ${entitlement.propertyLimit === 1 ? "property" : "properties"}. `
              : "Your free trial has ended. "}
            <Link href="/billing" className="font-medium text-brand hover:underline">
              Choose a plan in Billing
            </Link>{" "}
            to add another property.
          </p>
        ) : (
          <PropertyForm action={createPropertyAction} initialValues={{}} submitLabel="Add property" cancelHref="/properties" />
        )}
      </div>
    </section>
  );
}
