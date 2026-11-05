import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { createClient, createPool, updatePool } from "@/server/barrier/commands";
import { getPool } from "@/server/barrier/queries";
import { updateCouncil } from "@/server/councils/commands";
import { councilExists, listCouncils } from "@/server/councils/queries";
import { createUser } from "../support/factories";

const councilEdit = { lodgementMethod: "EMAIL" as const, contactEmail: "pools@example.gov.au", contactPhone: null, portalUrl: null, sourceUrl: "https://example.gov.au/pools", notes: null };

async function poolFor(userId: string, councilId: string | null = null) {
  const client = await createClient(userId, { name: "Sam", email: null, phone: null, notes: null });
  return (await createPool(userId, { clientId: client.id, kind: "POOL", addressLine1: "5 Water St", addressLine2: null, suburb: "Casey", postcode: "3977", councilId, notes: null }))!;
}

describe("councils", () => {
  it("has seeded rows that survive the test truncation, all unverified", async () => {
    const councils = await listCouncils();
    expect(councils.length).toBeGreaterThanOrEqual(15);
    expect(councils.every((council) => council.verifiedAt === null && council.sourceUrl === null)).toBe(true);
  });

  it("links a pool to a council and sets null when the council is deleted", async () => {
    const user = await createUser();
    const council = (await listCouncils())[0];
    const pool = await poolFor(user.id, council.id);
    expect((await getPool(user.id, pool.id))?.council?.name).toBe(council.name);

    const temp = await db.council.create({ data: { name: "Temp council" } });
    const updated = (await updatePool(user.id, pool.id, { clientId: pool.clientId, kind: "POOL", addressLine1: pool.addressLine1, addressLine2: null, suburb: pool.suburb, postcode: pool.postcode, councilId: temp.id, notes: null }))!;
    expect(updated.councilId).toBe(temp.id);
    await db.council.delete({ where: { id: temp.id } });
    expect((await getPool(user.id, pool.id))?.councilId).toBeNull();
  });

  it("keeps the pool owner scoping when a council is linked", async () => {
    const owner = await createUser();
    const other = await createUser();
    const pool = await poolFor(owner.id, (await listCouncils())[0].id);
    expect(await getPool(other.id, pool.id)).toBeNull();
  });

  it("checks council ids", async () => {
    expect(await councilExists("not-a-uuid")).toBe(false);
    expect(await councilExists((await listCouncils())[0].id)).toBe(true);
  });

  it("admin edit verifies on a source URL and audits field names only", async () => {
    const admin = await createUser();
    const council = (await listCouncils())[0];
    expect(await updateCouncil(admin.id, council.id, councilEdit)).toBe(true);
    const after = await db.council.findUniqueOrThrow({ where: { id: council.id } });
    expect(after.verifiedAt).not.toBeNull();
    const event = await db.auditEvent.findFirstOrThrow({ where: { userId: admin.id, action: "council.updated" } });
    expect(event.metadata).toEqual({ changedFields: ["lodgementMethod", "contactEmail", "sourceUrl"] });

    await updateCouncil(admin.id, council.id, { ...councilEdit, sourceUrl: null });
    expect((await db.council.findUniqueOrThrow({ where: { id: council.id } })).verifiedAt).toBeNull();
    expect(await updateCouncil(admin.id, "not-a-uuid", councilEdit)).toBe(false);
    await db.council.update({ where: { id: council.id }, data: { lodgementMethod: "OTHER", contactEmail: null, sourceUrl: null, verifiedAt: null } });
  });
});
