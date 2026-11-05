import "server-only";
import { isUuid } from "@/lib/ids";
import type { ClientInput, PoolInput } from "@/lib/barrier-validation";
import { recordAuditEvent } from "@/server/audit";
import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";

// Mutations scoped to the inspector who owns the data. A missing id or someone else's id returns
// null (or false), so callers show the same "not found" response for both.

type AuditAction = Parameters<typeof recordAuditEvent>[0]["action"];

function audit(userId: string, resourceType: "client" | "pool", resourceId: string, action: AuditAction, metadata = {}) {
  return { userId, resourceType, resourceId, action, metadata };
}

function changedFields(before: Record<string, unknown>, next: Record<string, unknown>): string[] {
  return Object.keys(next).filter((field) => before[field] !== next[field]);
}

export async function createClient(userId: string, input: ClientInput) {
  return db.$transaction(async (tx) => {
    const client = await tx.client.create({ data: { ...input, userId } });
    await recordAuditEvent(audit(userId, "client", client.id, "client.created"), tx);
    return client;
  });
}

export async function updateClient(userId: string, clientId: string, input: ClientInput) {
  if (!isUuid(clientId)) return null;
  return db.$transaction(async (tx) => {
    const before = await tx.client.findFirst({ where: { id: clientId, userId } });
    if (!before) return null;
    const fields = changedFields(before, input);
    if (fields.length === 0) return before;
    const client = await tx.client.update({ where: { id: before.id }, data: input });
    await recordAuditEvent(audit(userId, "client", client.id, "client.updated", { changedFields: fields }), tx);
    return client;
  });
}

// Archiving a client also archives their pools, so nothing active is left under a hidden client.
export async function archiveClient(userId: string, clientId: string): Promise<boolean> {
  if (!isUuid(clientId)) return false;
  return db.$transaction(async (tx) => {
    const now = new Date();
    const { count } = await tx.client.updateMany({ where: { id: clientId, userId, archivedAt: null }, data: { archivedAt: now } });
    if (count === 0) return (await tx.client.count({ where: { id: clientId, userId } })) > 0;
    await tx.pool.updateMany({ where: { clientId, userId, archivedAt: null }, data: { archivedAt: now } });
    await recordAuditEvent(audit(userId, "client", clientId, "client.archived"), tx);
    return true;
  });
}

// Pools stay archived; the inspector restores the ones that are still wanted.
export async function restoreClient(userId: string, clientId: string): Promise<boolean> {
  if (!isUuid(clientId)) return false;
  return db.$transaction(async (tx) => {
    const { count } = await tx.client.updateMany({ where: { id: clientId, userId, archivedAt: { not: null } }, data: { archivedAt: null } });
    if (count === 0) return (await tx.client.count({ where: { id: clientId, userId } })) > 0;
    await recordAuditEvent(audit(userId, "client", clientId, "client.restored"), tx);
    return true;
  });
}

async function activeClient(tx: Prisma.TransactionClient, userId: string, clientId: string) {
  if (!isUuid(clientId)) return null;
  return tx.client.findFirst({ where: { id: clientId, userId, archivedAt: null }, select: { id: true } });
}

// Returns null when the client is missing, someone else's, or archived.
export async function createPool(userId: string, input: PoolInput) {
  return db.$transaction(async (tx) => {
    if (!(await activeClient(tx, userId, input.clientId))) return null;
    const pool = await tx.pool.create({ data: { ...input, userId } });
    await recordAuditEvent(audit(userId, "pool", pool.id, "pool.created"), tx);
    return pool;
  });
}

export async function updatePool(userId: string, poolId: string, input: PoolInput) {
  if (!isUuid(poolId)) return null;
  return db.$transaction(async (tx) => {
    const before = await tx.pool.findFirst({ where: { id: poolId, userId } });
    if (!before) return null;
    if (input.clientId !== before.clientId && !(await activeClient(tx, userId, input.clientId))) return null;
    const fields = changedFields(before, input);
    if (fields.length === 0) return before;
    const pool = await tx.pool.update({ where: { id: before.id }, data: input });
    await recordAuditEvent(audit(userId, "pool", pool.id, "pool.updated", { changedFields: fields }), tx);
    return pool;
  });
}

export async function archivePool(userId: string, poolId: string): Promise<boolean> {
  if (!isUuid(poolId)) return false;
  return db.$transaction(async (tx) => {
    const { count } = await tx.pool.updateMany({ where: { id: poolId, userId, archivedAt: null }, data: { archivedAt: new Date() } });
    if (count === 0) return (await tx.pool.count({ where: { id: poolId, userId } })) > 0;
    await recordAuditEvent(audit(userId, "pool", poolId, "pool.archived"), tx);
    return true;
  });
}

// A pool cannot come back while its client is archived.
export async function restorePool(userId: string, poolId: string): Promise<boolean | "client_archived"> {
  if (!isUuid(poolId)) return false;
  return db.$transaction(async (tx) => {
    const pool = await tx.pool.findFirst({ where: { id: poolId, userId }, select: { archivedAt: true, client: { select: { archivedAt: true } } } });
    if (!pool) return false;
    if (!pool.archivedAt) return true;
    if (pool.client.archivedAt) return "client_archived" as const;
    await tx.pool.update({ where: { id: poolId }, data: { archivedAt: null } });
    await recordAuditEvent(audit(userId, "pool", poolId, "pool.restored"), tx);
    return true;
  });
}
