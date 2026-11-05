import { existsSync, readdirSync, utimesSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GET as downloadPhoto } from "@/app/api/inspection-photos/[id]/download/route";
import { exportAccountData } from "@/server/account-export";
import { createClient, createPool } from "@/server/barrier/commands";
import { countRecallsDue, createInspection, deleteInspectionPhoto, findPhotoForUser, getInspection, listInspectionsForPool, PHOTO_MESSAGES, updateInspection, uploadInspectionPhoto } from "@/server/barrier/inspections";
import { detectPhotoType } from "@/server/barrier/photo-type";
import { nextRecallDate } from "@/server/barrier/recall-date";
import { db } from "@/server/db";
import { deleteOrphanedFiles } from "@/server/vault/cleanup";
import { MAX_PHOTOS_PER_INSPECTION } from "@/lib/inspection-validation";
import { createVerifiedUser } from "../support/auth-http";
import { createUser } from "../support/factories";
import { pdfBytes, pngBytes, textBytes } from "../support/files";

const STORAGE_ROOT = path.resolve("tmp/test-storage");
const input = (overrides = {}) => ({ kind: "PERIODIC" as const, outcome: "PASS" as const, inspectedOn: "2026-09-01", certificateNumber: null, lodgedOn: null, notes: null, ...overrides });

async function setup(userId: string) {
  const client = await createClient(userId, { name: "Sam", email: "sam@example.com", phone: null, notes: null });
  const pool = (await createPool(userId, { clientId: client.id, kind: "POOL", addressLine1: "5 Water St", addressLine2: null, suburb: "Casey", postcode: "3977", councilId: null, notes: null }))!;
  return pool;
}

describe("recall date and photo type", () => {
  it("adds 48 months for a pass only, clamping 29 February", () => {
    expect(nextRecallDate("PASS", "2026-09-01")).toBe("2030-09-01");
    expect(nextRecallDate("PASS", "2024-02-29")).toBe("2028-02-29");
    expect(nextRecallDate("PASS", "2025-02-28")).toBe("2029-02-28");
    expect(nextRecallDate("FAIL", "2026-09-01")).toBeNull();
    expect(nextRecallDate("PENDING", "2026-09-01")).toBeNull();
  });

  it("detects images by magic bytes and rejects PDFs and text", () => {
    expect(detectPhotoType(pngBytes())?.contentType).toBe("image/png");
    expect(detectPhotoType(pdfBytes())).toBeNull();
    expect(detectPhotoType(textBytes("hello"))).toBeNull();
  });
});

describe("inspections", () => {
  it("stores the recall date, audits field names only, and recomputes on edit", async () => {
    const user = await createUser();
    const pool = await setup(user.id);
    const created = (await createInspection(user.id, pool.id, input()))!;
    expect(created.nextRecallOn?.toISOString().slice(0, 10)).toBe("2030-09-01");

    const failed = (await updateInspection(user.id, created.id, input({ outcome: "FAIL" })))!;
    expect(failed.nextRecallOn).toBeNull();
    const event = await db.auditEvent.findFirstOrThrow({ where: { userId: user.id, action: "inspection.updated" } });
    expect(event.metadata).toEqual({ changedFields: ["outcome", "nextRecallOn"] });
  });

  it("scopes to the owner", async () => {
    const owner = await createUser();
    const other = await createUser();
    const pool = await setup(owner.id);
    const inspection = (await createInspection(owner.id, pool.id, input()))!;
    expect(await createInspection(other.id, pool.id, input())).toBeNull();
    expect(await updateInspection(other.id, inspection.id, input())).toBeNull();
    expect(await getInspection(other.id, inspection.id)).toBeNull();
    expect(await listInspectionsForPool(other.id, pool.id)).toEqual([]);
    expect(await uploadInspectionPhoto(other.id, inspection.id, { name: "a.png", bytes: pngBytes() }, null)).toEqual({ ok: false, reason: "not_found" });
  });

  it("counts only each pool's latest pass that falls inside the window", async () => {
    const user = await createUser();
    const pool = await setup(user.id);
    await createInspection(user.id, pool.id, input({ inspectedOn: "2022-06-01" }));
    expect(await countRecallsDue(user.id, "2026-05-01", 90)).toBe(1);
    expect(await countRecallsDue(user.id, "2026-01-01", 90)).toBe(0);
    await createInspection(user.id, pool.id, input({ inspectedOn: "2026-05-01" }));
    expect(await countRecallsDue(user.id, "2026-05-02", 90)).toBe(0);
  });
});

describe("inspection photos", () => {
  async function inspectionFor(userId: string) {
    const pool = await setup(userId);
    return (await createInspection(userId, pool.id, input()))!;
  }

  it("stores a photo under a filename-free key and removes it on delete", async () => {
    const user = await createUser();
    const inspection = await inspectionFor(user.id);
    const result = await uploadInspectionPhoto(user.id, inspection.id, { name: "Gate latch.png", bytes: pngBytes() }, "Latch");
    expect(result.ok).toBe(true);
    const photo = await db.inspectionPhoto.findFirstOrThrow({ where: { inspectionId: inspection.id } });
    expect(photo.storageKey).toBe(`documents/${user.id}/${photo.id}`);
    expect(photo.storageKey).not.toContain("Gate");
    expect(existsSync(path.join(STORAGE_ROOT, photo.storageKey))).toBe(true);

    const deleted = await deleteInspectionPhoto(user.id, photo.id);
    expect(deleted?.inspectionId).toBe(inspection.id);
    expect(existsSync(path.join(STORAGE_ROOT, photo.storageKey))).toBe(false);
    expect(await deleteInspectionPhoto(user.id, photo.id)).toBeNull();
  });

  it("rejects renamed non-images, PDFs, empty and oversized files", async () => {
    const user = await createUser();
    const inspection = await inspectionFor(user.id);
    const bad = async (name: string, bytes: Uint8Array) => uploadInspectionPhoto(user.id, inspection.id, { name, bytes }, null);
    expect(await bad("x.png", textBytes("hello"))).toEqual({ ok: false, reason: "invalid", message: PHOTO_MESSAGES.wrongType });
    expect(await bad("x.jpg", pdfBytes())).toEqual({ ok: false, reason: "invalid", message: PHOTO_MESSAGES.wrongType });
    expect(await bad("x.png", new Uint8Array())).toEqual({ ok: false, reason: "invalid", message: PHOTO_MESSAGES.empty });
    expect(await bad("x.png", new Uint8Array(8 * 1024 * 1024 + 1))).toEqual({ ok: false, reason: "invalid", message: PHOTO_MESSAGES.tooLarge });
    expect(await db.inspectionPhoto.count()).toBe(0);
  });

  it("caps photos per inspection and leaves no stored file for the rejected one", async () => {
    const user = await createUser();
    const inspection = await inspectionFor(user.id);
    for (let i = 0; i < MAX_PHOTOS_PER_INSPECTION; i++) {
      expect((await uploadInspectionPhoto(user.id, inspection.id, { name: `${i}.png`, bytes: pngBytes() }, null)).ok).toBe(true);
    }
    const extra = await uploadInspectionPhoto(user.id, inspection.id, { name: "extra.png", bytes: pngBytes() }, null);
    expect(extra).toEqual({ ok: false, reason: "invalid", message: PHOTO_MESSAGES.tooMany });
    expect(readdirSync(path.join(STORAGE_ROOT, "documents", user.id))).toHaveLength(MAX_PHOTOS_PER_INSPECTION);
  });

  it("serves photos only to the owning inspector, as attachments", async () => {
    const owner = await createVerifiedUser("insp@example.com");
    const other = await createVerifiedUser("other-insp@example.com");
    await db.user.updateMany({ where: { id: { in: [owner.userId, other.userId] } }, data: { accountType: "INSPECTOR" } });
    const inspection = await inspectionFor(owner.userId);
    await uploadInspectionPhoto(owner.userId, inspection.id, { name: "a.png", bytes: pngBytes() }, null);
    const photo = (await findPhotoForUser(owner.userId, (await db.inspectionPhoto.findFirstOrThrow()).id))!;

    const get = (cookie?: string) =>
      downloadPhoto(new Request("http://localhost:3000/x", { headers: new Headers(cookie ? { cookie } : {}) }), { params: Promise.resolve({ id: photo.id }) });
    expect((await get()).status).toBe(404);
    expect((await get(other.cookie)).status).toBe(404);
    const ok = await get(owner.cookie);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-disposition")).toContain("attachment");
    expect(ok.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("includes inspections and photo files in the export without storage keys", async () => {
    const user = await createUser();
    const inspection = await inspectionFor(user.id);
    await uploadInspectionPhoto(user.id, inspection.id, { name: "a.png", bytes: pngBytes() }, null);
    const stream = await exportAccountData(user.id);
    const text = Buffer.from(await new Response(stream).arrayBuffer()).toString("latin1");
    expect(text).toContain("inspections.json");
    expect(text).toContain("inspection-photos/");
  });

  it("keeps stored photos when the orphan cleanup runs", async () => {
    const user = await createUser();
    const inspection = await inspectionFor(user.id);
    await uploadInspectionPhoto(user.id, inspection.id, { name: "a.png", bytes: pngBytes() }, null);
    const photo = await db.inspectionPhoto.findFirstOrThrow();
    const file = path.join(STORAGE_ROOT, photo.storageKey);
    const old = new Date(Date.now() - 3 * 86_400_000);
    utimesSync(file, old, old);

    await deleteOrphanedFiles();
    expect(existsSync(file)).toBe(true);
  });
});
