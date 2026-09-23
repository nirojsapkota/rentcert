import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { GET as exportRoute } from "@/app/api/account/export/route";
import { POST as visitRoute } from "@/app/api/visit/route";
import { handleStripeWebhook } from "@/server/billing/webhook";
import { recordCompletion, setUpChecks } from "@/server/compliance/commands";
import { recordPackGenerated } from "@/server/compliance-pack/load";
import { db } from "@/server/db";
import { createProperty } from "@/server/properties/commands";
import { uploadDocument } from "@/server/vault/commands";
import { createVerifiedUser } from "../support/auth-http";
import { fakeStripe, signedEvent } from "../support/fake-stripe";
import { insertProperty, propertyInput } from "../support/factories";
import { pdfBytes, pngBytes } from "../support/files";

async function download(cookie?: string) {
  const response = await exportRoute(new Request("http://localhost:3000/api/account/export", { headers: cookie ? { cookie } : {} }));
  return { response, files: response.status === 200 ? unzipSync(new Uint8Array(await response.arrayBuffer())) : {} };
}

describe("account data export", () => {
  it("contains only the user's own data and original documents", async () => {
    const alice = await createVerifiedUser("alice@example.com");
    const bob = await createVerifiedUser("bob@example.com");
    const property = await insertProperty(alice.userId, { addressLine1: "12 Smith Street" });
    const done = await recordCompletion(alice.userId, property.id, "gas", { completedOn: "2026-09-01", providerName: "ABC Safety", providerLicenceNumber: null, notes: null });
    if (!done.ok) throw new Error("setup failed");
    await uploadDocument(alice.userId, property.id, done.recordId, { name: "Gas certificate.pdf", bytes: pdfBytes() });
    await uploadDocument(alice.userId, property.id, done.recordId, { name: "Gas certificate.pdf", bytes: pngBytes() });
    const bobsProperty = await insertProperty(bob.userId, { addressLine1: "99 Private Lane" });
    const bobsRecord = await recordCompletion(bob.userId, bobsProperty.id, "gas", { completedOn: "2026-09-01", providerName: null, providerLicenceNumber: null, notes: null });
    if (!bobsRecord.ok) throw new Error("setup failed");
    await uploadDocument(bob.userId, bobsProperty.id, bobsRecord.recordId, { name: "Bob private.pdf", bytes: pdfBytes() });

    const { response, files } = await download(alice.cookie);

    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="rentcert-export-\d{4}-\d{2}-\d{2}\.zip"$/);
    expect(Object.keys(files).sort()).toEqual([
      "account.json",
      "audit-events.json",
      "compliance-records.json",
      "documents.json",
      "documents/Gas certificate.pdf",
      "documents/Gas certificate.png",
      "not-applicable.json",
      "properties.json",
      "reminders.json",
    ]);
    const all = Object.entries(files).filter(([name]) => name.endsWith(".json")).map(([, bytes]) => strFromU8(bytes)).join("\n");
    expect(all).toContain("alice@example.com");
    expect(all).toContain("12 Smith Street");
    expect(all).toContain("ABC Safety");
    expect(all).not.toContain("bob@example.com");
    expect(all).not.toContain("99 Private Lane");
    expect(all).not.toContain("Bob private");
    expect(all).not.toContain("storageKey");
    expect(all).not.toContain("password");
    expect(files["documents/Gas certificate.pdf"]).toEqual(pdfBytes());
    expect(await db.auditEvent.count({ where: { userId: alice.userId, action: "account.exported" } })).toBe(1);
  });

  it("returns 404 without a session", async () => {
    expect((await download()).response.status).toBe(404);
  });
});

describe("product events", () => {
  it("are recorded at each funnel step with no personal details", async () => {
    const { userId } = await createVerifiedUser("funnel@example.com");
    const created = await createProperty(userId, propertyInput());
    if (!created.ok) throw new Error("setup failed");
    await setUpChecks(userId, created.property.id, "2026-09-23", { gas: { choice: "date", lastCheckOn: "2025-01-01" } });
    const done = await recordCompletion(userId, created.property.id, "gas", { completedOn: "2026-09-01", providerName: null, providerLicenceNumber: null, notes: null });
    if (!done.ok) throw new Error("setup failed");
    await uploadDocument(userId, created.property.id, done.recordId, { name: "x.pdf", bytes: pdfBytes() });
    await recordPackGenerated(userId, created.property.id);

    const stripe = fakeStripe();
    stripe.subscriptions.set("sub_1", { customer: "cus_1", status: "active", price: "price_property" });
    const event = await signedEvent({ id: "evt_1", type: "checkout.session.completed", data: { object: { id: "cs_1", object: "checkout.session", client_reference_id: userId, customer: "cus_1", subscription: "sub_1" } } });
    await handleStripeWebhook(event.payload, event.signature, stripe.client);

    const events = await db.productEvent.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
    expect(events.map((row) => row.name)).toEqual([
      "signup",
      "property_created",
      "compliance_record_created",
      "compliance_record_created",
      "document_uploaded",
      "compliance_pack_downloaded",
      "subscription_started",
    ]);
    expect(Object.keys(events[0]).sort()).toEqual(["createdAt", "id", "name", "userId"]);
  });

  it("keep counts after the account is deleted", async () => {
    const { userId } = await createVerifiedUser();
    await db.user.delete({ where: { id: userId } });
    expect(await db.productEvent.count({ where: { name: "signup", userId: null } })).toBe(1);
  });

  it("count landing visits per day without identifiers", async () => {
    await visitRoute();
    await visitRoute();
    const rows = await db.landingVisit.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(2);
  });
});
