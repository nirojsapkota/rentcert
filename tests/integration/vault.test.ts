import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GET as download } from "@/app/api/documents/[id]/download/route";
import { recordCompletion } from "@/server/compliance/commands";
import { db } from "@/server/db";
import { archiveProperty, createProperty } from "@/server/properties/commands";
import { deleteDocument, UPLOAD_MESSAGES, uploadDocument } from "@/server/vault/commands";
import { MAX_DOCUMENTS_PER_RECORD } from "@/server/vault/file-type";
import { listDocumentsForUser } from "@/server/vault/queries";
import { callAuth, createVerifiedUser, VALID_PASSWORD } from "../support/auth-http";
import { propertyInput } from "../support/factories";
import { pdfBytes, pngBytes, textBytes } from "../support/files";

const STORAGE_ROOT = path.resolve("tmp/test-storage");

async function ownerWithRecord(email = "owner@example.com") {
  const { cookie, userId } = await createVerifiedUser(email);
  const property = await createProperty(userId, propertyInput());
  const completion = await recordCompletion(userId, property.id, "gas", {
    completedOn: "2026-09-01",
    providerName: "ABC Safety",
    providerLicenceNumber: null,
    notes: null,
  });
  if (!completion.ok) throw new Error("setup failed");
  return { cookie, userId, propertyId: property.id, recordId: completion.recordId };
}

function requestDownload(documentId: string, cookie?: string) {
  const headers = new Headers(cookie ? { cookie } : {});
  return download(new Request(`http://localhost:3000/api/documents/${documentId}/download`, { headers }), {
    params: Promise.resolve({ id: documentId }),
  });
}

async function upload(owner: { userId: string; propertyId: string; recordId: string }, bytes = pdfBytes(), name = "Gas certificate.pdf") {
  const result = await uploadDocument(owner.userId, owner.propertyId, owner.recordId, { name, bytes });
  if (!result.ok) throw new Error(`upload failed: ${JSON.stringify(result)}`);
  return result.documentId;
}

describe("uploading and downloading (scenario 4)", () => {
  it("stores the file privately, records metadata and returns the same bytes", async () => {
    const owner = await ownerWithRecord();
    const documentId = await upload(owner);

    const row = await db.complianceDocument.findUniqueOrThrow({ where: { id: documentId } });
    expect(row).toMatchObject({ filename: "Gas certificate.pdf", contentType: "application/pdf", byteSize: pdfBytes().byteLength, scanStatus: "NOT_SCANNED" });
    expect(row.storageKey).toBe(`documents/${owner.userId}/${documentId}`);
    expect(row.storageKey).not.toContain("Gas");
    expect(existsSync(path.join(STORAGE_ROOT, row.storageKey))).toBe(true);

    const response = await requestDownload(documentId, owner.cookie);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; /);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(pdfBytes());

    const audit = await db.auditEvent.findFirstOrThrow({ where: { action: "document.uploaded" } });
    expect(audit.metadata).toEqual({ complianceRecordId: owner.recordId, contentType: "application/pdf", byteSize: pdfBytes().byteLength });
  });

  it("uses the detected type, not the name the browser sent", async () => {
    const owner = await ownerWithRecord();
    const documentId = await upload(owner, pngBytes(), "scan.pdf");

    expect(await db.complianceDocument.findUniqueOrThrow({ where: { id: documentId } })).toMatchObject({
      filename: "scan.png",
      contentType: "image/png",
    });
  });

  it.each([
    ["an HTML file named .pdf", textBytes("<html><script>alert(1)</script></html>"), UPLOAD_MESSAGES.wrongType],
    ["an empty file", new Uint8Array(), UPLOAD_MESSAGES.empty],
    ["an 11 MB PDF", (() => { const big = new Uint8Array(11 * 1024 * 1024); big.set(pdfBytes()); return big; })(), UPLOAD_MESSAGES.tooLarge],
  ])("rejects %s", async (_name, bytes, message) => {
    const owner = await ownerWithRecord();
    const result = await uploadDocument(owner.userId, owner.propertyId, owner.recordId, { name: "x.pdf", bytes });

    expect(result).toEqual({ ok: false, reason: "invalid", message });
    expect(await db.complianceDocument.count()).toBe(0);
  });

  it(`allows at most ${MAX_DOCUMENTS_PER_RECORD} documents per record`, async () => {
    const owner = await ownerWithRecord();
    for (let i = 0; i < MAX_DOCUMENTS_PER_RECORD; i++) await upload(owner);

    expect(await uploadDocument(owner.userId, owner.propertyId, owner.recordId, { name: "x.pdf", bytes: pdfBytes() })).toEqual({
      ok: false,
      reason: "invalid",
      message: UPLOAD_MESSAGES.tooMany,
    });
  });

  it("refuses uploads to an archived property", async () => {
    const owner = await ownerWithRecord();
    await archiveProperty(owner.userId, owner.propertyId);

    expect(await uploadDocument(owner.userId, owner.propertyId, owner.recordId, { name: "x.pdf", bytes: pdfBytes() })).toMatchObject({
      ok: false,
      message: UPLOAD_MESSAGES.archived,
    });
  });

  it("returns 404 without a session", async () => {
    const owner = await ownerWithRecord();
    const documentId = await upload(owner);

    expect((await requestDownload(documentId)).status).toBe(404);
    expect((await requestDownload("not-a-uuid", owner.cookie)).status).toBe(404);
  });
});

describe("document isolation (IDOR)", () => {
  it("never lets user B download, upload to or delete user A's documents", async () => {
    const alice = await ownerWithRecord("alice@example.com");
    const bob = await ownerWithRecord("bob@example.com");
    const documentId = await upload(alice);
    const row = await db.complianceDocument.findUniqueOrThrow({ where: { id: documentId } });

    const response = await requestDownload(documentId, bob.cookie);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");

    expect(await uploadDocument(bob.userId, alice.propertyId, alice.recordId, { name: "x.pdf", bytes: pdfBytes() })).toEqual({ ok: false, reason: "not_found" });
    // Bob's own property id paired with Alice's record id.
    expect(await uploadDocument(bob.userId, bob.propertyId, alice.recordId, { name: "x.pdf", bytes: pdfBytes() })).toEqual({ ok: false, reason: "not_found" });
    expect(await deleteDocument(bob.userId, documentId)).toEqual({ ok: false, reason: "not_found" });

    expect((await listDocumentsForUser(bob.userId, 1)).total).toBe(0);
    expect(await db.complianceDocument.count({ where: { id: documentId } })).toBe(1);
    expect(existsSync(path.join(STORAGE_ROOT, row.storageKey))).toBe(true);
    expect((await requestDownload(documentId, alice.cookie)).status).toBe(200);
  });
});

describe("deleting", () => {
  it("removes the row and the stored file", async () => {
    const owner = await ownerWithRecord();
    const documentId = await upload(owner);
    const row = await db.complianceDocument.findUniqueOrThrow({ where: { id: documentId } });

    expect(await deleteDocument(owner.userId, documentId)).toMatchObject({ ok: true, recordId: owner.recordId });
    expect(existsSync(path.join(STORAGE_ROOT, row.storageKey))).toBe(false);
    expect((await requestDownload(documentId, owner.cookie)).status).toBe(404);
    expect(await db.auditEvent.count({ where: { action: "document.deleted" } })).toBe(1);
  });

  it("removes every stored file when the account is deleted", async () => {
    const owner = await ownerWithRecord();
    await upload(owner);
    await upload(owner, pngBytes(), "photo.png");
    const userDir = path.join(STORAGE_ROOT, "documents", owner.userId);
    expect(readdirSync(userDir)).toHaveLength(2);

    const response = await callAuth("/delete-user", { cookie: owner.cookie, body: { password: VALID_PASSWORD } });

    expect(response.status).toBe(200);
    expect(existsSync(userDir)).toBe(false);
    expect(await db.complianceDocument.count()).toBe(0);
  });
});
