import { randomUUID } from "node:crypto";
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
