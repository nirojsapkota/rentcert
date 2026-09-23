import { randomUUID } from "node:crypto";
import { parseCalendarDate } from "@/lib/calendar-date";
import type { PropertyInput } from "@/lib/property-validation";
import { db } from "@/server/db";

// Creates a user row directly. Use auth-http helpers when a test needs a real session.
export async function createUser(email = `${randomUUID()}@example.com`) {
  return db.user.create({
    data: { id: randomUUID(), email, name: "Test User", firstName: "Test", lastName: "User", emailVerified: true },
  });
}

export function propertyInput(overrides: Partial<PropertyInput> = {}): PropertyInput {
  return {
    addressLine1: "12 Example Street",
    addressLine2: null,
    suburb: "Narre Warren",
    state: "VIC",
    postcode: "3805",
    nickname: null,
    notes: null,
    leaseStartDate: "2024-10-12",
    ...overrides,
  };
}

// Inserts a property row directly, without plan limits or audit events. Use it when a test
// needs properties as fixtures; use createProperty() when the test is about creating them.
export async function insertProperty(userId: string, overrides: Partial<PropertyInput> = {}) {
  const input = propertyInput(overrides);
  return db.property.create({
    data: { ...input, userId, leaseStartDate: input.leaseStartDate ? parseCalendarDate(input.leaseStartDate) : null },
  });
}

// Gives a user an active Stripe subscription row for the plan (no Stripe calls).
export async function subscribe(userId: string, plan: "PROPERTY" | "PORTFOLIO", status = "active") {
  const account = await db.billingAccount.upsert({
    where: { userId },
    create: { userId, stripeCustomerId: `cus_${randomUUID()}` },
    update: {},
  });
  return db.subscription.create({
    data: { billingAccountId: account.id, stripeSubscriptionId: `sub_${randomUUID()}`, plan, status },
  });
}
