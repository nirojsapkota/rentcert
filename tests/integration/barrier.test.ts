import { describe, expect, it } from "vitest";
import { poolSchema } from "@/lib/barrier-validation";
import { db } from "@/server/db";
import { exportAccountData } from "@/server/account-export";
import { archiveClient, archivePool, createClient, createPool, restoreClient, restorePool, updateClient, updatePool } from "@/server/barrier/commands";
import { getClient, getPool, listClients, listPools } from "@/server/barrier/queries";
import { callAuth } from "../support/auth-http";
import { createUser } from "../support/factories";

const clientInput = { name: "Sam Pool Owner", email: "sam@example.com", phone: "0400 000 000", notes: null };
const poolInput = (clientId: string, overrides = {}) => ({
  clientId,
  kind: "POOL" as const,
  addressLine1: "5 Water Street",
  addressLine2: null,
  suburb: "Casey",
  postcode: "3977",
  councilId: null,
  notes: null,
  ...overrides,
});

async function actions(userId: string) {
  const events = await db.auditEvent.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  return events.map((event) => event.action);
}

describe("barrier register", () => {
  it("creates and updates a client with audit events listing only changed field names", async () => {
    const user = await createUser();
    const client = await createClient(user.id, clientInput);
    await updateClient(user.id, client.id, { ...clientInput, phone: null });

    expect(await actions(user.id)).toEqual(["client.created", "client.updated"]);
    const event = await db.auditEvent.findFirstOrThrow({ where: { userId: user.id, action: "client.updated" } });
    expect(event.metadata).toEqual({ changedFields: ["phone"] });
  });

  it("scopes every read and write to the owner", async () => {
    const owner = await createUser();
    const other = await createUser();
    const client = await createClient(owner.id, clientInput);
    const pool = (await createPool(owner.id, poolInput(client.id)))!;

    expect(await getClient(other.id, client.id)).toBeNull();
    expect(await getPool(other.id, pool.id)).toBeNull();
    expect(await updateClient(other.id, client.id, clientInput)).toBeNull();
    expect(await archiveClient(other.id, client.id)).toBe(false);
    expect(await archivePool(other.id, pool.id)).toBe(false);
    expect(await createPool(other.id, poolInput(client.id))).toBeNull();
    expect((await listClients(other.id, { view: "active", page: 1 })).total).toBe(0);
    expect((await listPools(other.id, { view: "active", page: 1 })).total).toBe(0);
    expect(await getClient(owner.id, "not-a-uuid")).toBeNull();
  });

  it("cannot move a pool to another inspector's client", async () => {
    const owner = await createUser();
    const other = await createUser();
    const mine = await createClient(owner.id, clientInput);
    const theirs = await createClient(other.id, clientInput);
    const pool = (await createPool(owner.id, poolInput(mine.id)))!;

    expect(await updatePool(owner.id, pool.id, poolInput(theirs.id))).toBeNull();
    expect((await getPool(owner.id, pool.id))?.clientId).toBe(mine.id);
  });

  it("archives a client's pools with it and blocks pool restore until the client is restored", async () => {
    const user = await createUser();
    const client = await createClient(user.id, clientInput);
    const pool = (await createPool(user.id, poolInput(client.id)))!;

    expect(await archiveClient(user.id, client.id)).toBe(true);
    expect((await getPool(user.id, pool.id))?.archivedAt).not.toBeNull();
    expect(await createPool(user.id, poolInput(client.id))).toBeNull();
    expect(await restorePool(user.id, pool.id)).toBe("client_archived");

    expect(await restoreClient(user.id, client.id)).toBe(true);
    expect(await restorePool(user.id, pool.id)).toBe(true);
    expect((await getPool(user.id, pool.id))?.archivedAt).toBeNull();
    expect(await actions(user.id)).toEqual(["client.created", "pool.created", "client.archived", "client.restored", "pool.restored"]);
  });

  it("searches clients and pools", async () => {
    const user = await createUser();
    const sam = await createClient(user.id, clientInput);
    await createClient(user.id, { ...clientInput, name: "Jo Other", email: null });
    await createPool(user.id, poolInput(sam.id));

    expect((await listClients(user.id, { view: "active", page: 1, search: "sam" })).items.map((c) => c.name)).toEqual(["Sam Pool Owner"]);
    expect((await listPools(user.id, { view: "active", page: 1, search: "3977" })).total).toBe(1);
    expect((await listPools(user.id, { view: "active", page: 1, search: "nowhere" })).total).toBe(0);
  });

  it("removes clients and pools when the account is deleted", async () => {
    const user = await createUser();
    const client = await createClient(user.id, clientInput);
    await createPool(user.id, poolInput(client.id));

    await db.user.delete({ where: { id: user.id } });

    expect(await db.client.count()).toBe(0);
    expect(await db.pool.count()).toBe(0);
  });

  it("includes clients and pools in the data export", async () => {
    const user = await createUser();
    const client = await createClient(user.id, clientInput);
    await createPool(user.id, poolInput(client.id));

    const bytes = new Uint8Array(await new Response(await exportAccountData(user.id)).arrayBuffer());
    const text = Buffer.from(bytes).toString("latin1");
    expect(text).toContain("clients.json");
    expect(text).toContain("pools.json");
  });
});

describe("pool validation", () => {
  const valid = { ...poolInput("0198c5f0-7b1a-7000-8000-000000000000"), addressLine2: "", councilId: "", notes: "" };

  it("accepts Victorian postcodes only", () => {
    expect(poolSchema.safeParse({ ...valid, postcode: "3977" }).success).toBe(true);
    expect(poolSchema.safeParse({ ...valid, postcode: "2000" }).success).toBe(false);
    expect(poolSchema.safeParse({ ...valid, postcode: "397" }).success).toBe(false);
  });
});

describe("account type at sign-up", () => {
  const body = (extra: object) => ({ email: "inspector@example.com", password: "correct horse battery staple", firstName: "Ina", lastName: "Spector", name: "Ina Spector", ...extra });

  it("stores INSPECTOR, defaults to LANDLORD, and rejects other values", async () => {
    const inspector = await callAuth("/sign-up/email", { body: body({ accountType: "INSPECTOR" }), ip: "203.0.113.21" });
    expect(inspector.status).toBe(200);
    expect((await db.user.findUniqueOrThrow({ where: { email: "inspector@example.com" } })).accountType).toBe("INSPECTOR");

    const landlord = await callAuth("/sign-up/email", { body: body({ email: "landlord2@example.com" }), ip: "203.0.113.22" });
    expect(landlord.status).toBe(200);
    expect((await db.user.findUniqueOrThrow({ where: { email: "landlord2@example.com" } })).accountType).toBe("LANDLORD");

    const bad = await callAuth("/sign-up/email", { body: body({ email: "bad@example.com", accountType: "ADMIN" }), ip: "203.0.113.23" });
    expect(bad.status).toBe(400);
    expect(await db.user.count({ where: { email: "bad@example.com" } })).toBe(0);
  });
});
