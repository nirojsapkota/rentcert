import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import {
  archiveProperty,
  createProperty,
  deleteProperty,
  restoreProperty,
  updateProperty,
} from "@/server/properties/commands";
import {
  PROPERTIES_PAGE_SIZE,
  countActiveProperties,
  findPropertyForUser,
  listPropertiesForUser,
} from "@/server/properties/queries";
import { createUser, propertyInput } from "../support/factories";

async function auditActions(userId: string) {
  const events = await db.auditEvent.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  return events.map((event) => event.action);
}

describe("property commands", () => {
  it("creates a property with a calendar lease date and an audit event", async () => {
    const user = await createUser();

    const property = await createProperty(user.id, propertyInput());

    expect(property).toMatchObject({ userId: user.id, state: "VIC", postcode: "3805", archivedAt: null });
    expect(property.leaseStartDate?.toISOString()).toBe("2024-10-12T00:00:00.000Z");
    expect(await auditActions(user.id)).toEqual(["property.created"]);
  });

  it("records only the changed fields on update", async () => {
    const user = await createUser();
    const property = await createProperty(user.id, propertyInput());

    await updateProperty(user.id, property.id, propertyInput({ nickname: "Smith St", leaseStartDate: "2025-01-01" }));
    await updateProperty(user.id, property.id, propertyInput({ nickname: "Smith St", leaseStartDate: "2025-01-01" }));

    const events = await db.auditEvent.findMany({ where: { userId: user.id, action: "property.updated" } });
    expect(events).toHaveLength(1);
    expect(events[0].metadata).toEqual({ changedFields: ["nickname", "leaseStartDate"] });
  });

  it("archives and restores, and counts only active properties", async () => {
    const user = await createUser();
    const property = await createProperty(user.id, propertyInput());
    await createProperty(user.id, propertyInput({ addressLine1: "4 Sample Road" }));

    expect(await archiveProperty(user.id, property.id)).toBe(true);
    expect(await countActiveProperties(user.id)).toBe(1);
    expect(await archiveProperty(user.id, property.id)).toBe(true);

    expect(await restoreProperty(user.id, property.id)).toBe(true);
    expect(await countActiveProperties(user.id)).toBe(2);
    expect(await auditActions(user.id)).toEqual([
      "property.created",
      "property.created",
      "property.archived",
      "property.restored",
    ]);
  });

  it("deletes a property", async () => {
    const user = await createUser();
    const property = await createProperty(user.id, propertyInput());

    expect(await deleteProperty(user.id, property.id)).toBe(true);
    expect(await findPropertyForUser(user.id, property.id)).toBeNull();
    expect(await auditActions(user.id)).toContain("property.deleted");
  });

  it("treats a malformed id as not found", async () => {
    const user = await createUser();

    expect(await findPropertyForUser(user.id, "not-a-uuid")).toBeNull();
    expect(await updateProperty(user.id, "not-a-uuid", propertyInput())).toBeNull();
    expect(await archiveProperty(user.id, "1 OR 1=1")).toBe(false);
    expect(await deleteProperty(user.id, "../../etc")).toBe(false);
  });
});

describe("tenant isolation", () => {
  it("never lets user B read or change user A's property", async () => {
    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");
    const property = await createProperty(alice.id, propertyInput());
    const snapshot = await db.property.findUniqueOrThrow({ where: { id: property.id } });

    expect(await findPropertyForUser(bob.id, property.id)).toBeNull();
    expect(await updateProperty(bob.id, property.id, propertyInput({ nickname: "Mine now" }))).toBeNull();
    expect(await archiveProperty(bob.id, property.id)).toBe(false);
    expect(await restoreProperty(bob.id, property.id)).toBe(false);
    expect(await deleteProperty(bob.id, property.id)).toBe(false);

    expect(await db.property.findUniqueOrThrow({ where: { id: property.id } })).toEqual(snapshot);
    expect(await db.auditEvent.count({ where: { userId: bob.id } })).toBe(0);
  });

  it("lists and counts only the user's own properties", async () => {
    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");
    await createProperty(alice.id, propertyInput());
    await createProperty(bob.id, propertyInput({ state: "NSW", postcode: "2150", suburb: "Parramatta" }));

    const list = await listPropertiesForUser(alice.id, { view: "active", page: 1 });
    expect(list.items.map((item) => item.userId)).toEqual([alice.id]);
    expect(await countActiveProperties(bob.id)).toBe(1);
  });

  it("deletes a user's properties with the account", async () => {
    const alice = await createUser();
    await createProperty(alice.id, propertyInput());

    await db.user.delete({ where: { id: alice.id } });

    expect(await db.property.count({ where: { userId: alice.id } })).toBe(0);
  });
});

describe("listPropertiesForUser", () => {
  it("paginates newest first and separates archived properties", async () => {
    const user = await createUser();
    const created = [];
    for (let i = 1; i <= PROPERTIES_PAGE_SIZE + 2; i++) {
      created.push(await createProperty(user.id, propertyInput({ addressLine1: `${i} Example Street` })));
    }
    await archiveProperty(user.id, created[0].id);

    const first = await listPropertiesForUser(user.id, { view: "active", page: 1 });
    expect(first).toMatchObject({ total: PROPERTIES_PAGE_SIZE + 1, page: 1, pageCount: 2 });
    expect(first.items).toHaveLength(PROPERTIES_PAGE_SIZE);
    expect(first.items[0].addressLine1).toBe(`${PROPERTIES_PAGE_SIZE + 2} Example Street`);

    const second = await listPropertiesForUser(user.id, { view: "active", page: 2 });
    expect(second.items.map((item) => item.addressLine1)).toEqual(["2 Example Street"]);

    const archived = await listPropertiesForUser(user.id, { view: "archived", page: 1 });
    expect(archived.items.map((item) => item.id)).toEqual([created[0].id]);
  });
});

describe("database constraints", () => {
  it("rejects malformed postcodes even when validation is bypassed", async () => {
    const user = await createUser();
    for (const postcode of ["123", "12345", "0100", "ABCD"]) {
      await expect(
        db.property.create({ data: { ...propertyInput({ postcode }), leaseStartDate: null, userId: user.id } }),
      ).rejects.toThrow();
    }
  });

  it("rejects an unknown state", async () => {
    const user = await createUser();
    await expect(
      db.$executeRaw`INSERT INTO properties (id, user_id, address_line_1, suburb, state, postcode, updated_at)
        VALUES (gen_random_uuid(), ${user.id}, '1 Test St', 'Test', 'XX', '3000', now())`,
    ).rejects.toThrow();
  });
});
