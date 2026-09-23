import { describe, expect, it } from "vitest";
import { GET as downloadPack } from "@/app/api/properties/[id]/compliance-pack/route";
import { recordCompletion, setUpChecks } from "@/server/compliance/commands";
import { loadCompliancePack } from "@/server/compliance-pack/load";
import { db } from "@/server/db";
import { createProperty } from "@/server/properties/commands";
import { uploadDocument } from "@/server/vault/commands";
import { createVerifiedUser } from "../support/auth-http";
import { propertyInput } from "../support/factories";
import { pdfBytes } from "../support/files";
import { flat, pdfPages } from "../support/pdf-text";

async function ownerWithHistory(email = "owner@example.com") {
  const { cookie, userId } = await createVerifiedUser(email);
  const property = await createProperty(userId, propertyInput());
  await setUpChecks(userId, property.id, "2026-09-23", {
    smoke_alarm: { choice: "date", lastCheckOn: "2025-10-11" },
    electrical: { choice: "unknown" },
    gas: { choice: "date", lastCheckOn: "2024-09-02" },
  });
  const gas = await recordCompletion(userId, property.id, "gas", {
    completedOn: "2026-09-20",
    providerName: "ABC Safety",
    providerLicenceNumber: "GF-1234",
    notes: "private note",
  });
  if (!gas.ok) throw new Error("setup failed");
  await uploadDocument(userId, property.id, gas.recordId, { name: "Gas certificate.pdf", bytes: pdfBytes() });
  return { cookie, userId, propertyId: property.id };
}

const request = (propertyId: string, cookie?: string) =>
  downloadPack(new Request(`http://localhost:3000/api/properties/${propertyId}/compliance-pack`, { headers: cookie ? { cookie } : {} }), {
    params: Promise.resolve({ id: propertyId }),
  });

describe("loadCompliancePack", () => {
  it("collects summary, full history and documents, dated in the user's timezone", async () => {
    const owner = await ownerWithHistory();
    // 23:30 UTC on 22 September is 23 September in Melbourne.
    const data = await loadCompliancePack(owner.userId, owner.propertyId, "Australia/Melbourne", new Date("2026-09-22T23:30:00Z"));

    expect(data).toMatchObject({ generatedOn: "23 September 2026", generatedOnIso: "2026-09-23", isGeneric: false });
    expect(data!.summary.map((row) => [row.name, row.lastCompleted, row.nextDue])).toEqual([
      ["Smoke alarm check", "11 October 2025", "11 October 2026"],
      ["Electrical safety check", "Unknown", "23 September 2026"],
      ["Gas safety check", "20 September 2026", "20 September 2028"],
    ]);
    expect(data!.history.map((row) => row.completed)).toEqual(["20 September 2026", "11 October 2025", "2 September 2024", "Last check unknown"]);
    expect(data!.documents).toHaveLength(1);
    expect(data!.documents[0]).toMatchObject({ filename: "Gas certificate.pdf", requirement: "Gas safety check" });
    expect(JSON.stringify(data)).not.toContain("private note");
  });

  it("returns null for another user's property", async () => {
    const owner = await ownerWithHistory("alice@example.com");
    const { userId: bob } = await createVerifiedUser("bob@example.com");

    expect(await loadCompliancePack(bob, owner.propertyId, "Australia/Melbourne")).toBeNull();
  });
});

describe("GET /api/properties/[id]/compliance-pack", () => {
  it("returns the owner's PDF with download headers and an audit event (scenario 7)", async () => {
    const owner = await ownerWithHistory();
    const response = await request(owner.propertyId, owner.cookie);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="RentCert compliance pack - 12 Example Street - \d{4}-\d{2}-\d{2}\.pdf"/);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const text = flat(await pdfPages(new Uint8Array(await response.arrayBuffer())));
    expect(text).toContain("12 Example Street Narre Warren VIC 3805");
    expect(text).toContain("ABC Safety");
    expect(text).toContain("Gas certificate.pdf");
    expect(await db.auditEvent.count({ where: { userId: owner.userId, action: "compliance_pack.generated" } })).toBe(1);
  });

  it("returns 404 for another user, no session and a malformed id", async () => {
    const owner = await ownerWithHistory("alice@example.com");
    const bob = await createVerifiedUser("bob@example.com");

    for (const response of [await request(owner.propertyId, bob.cookie), await request(owner.propertyId), await request("../etc", owner.cookie)]) {
      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Not found");
    }
    expect(await db.auditEvent.count({ where: { action: "compliance_pack.generated" } })).toBe(0);
  });
});
