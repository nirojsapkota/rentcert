import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { isUuid } from "@/lib/ids";
import { db } from "@/server/db";

export type RegisterView = "active" | "archived";

const PAGE_SIZE = 25;

function paging(page: number) {
  const safe = Number.isInteger(page) && page > 0 ? page : 1;
  return { safe, skip: (safe - 1) * PAGE_SIZE };
}

export async function listClients(userId: string, options: { view: RegisterView; page: number; search?: string }) {
  const search = options.search?.trim();
  const where: Prisma.ClientWhereInput = {
    userId,
    archivedAt: options.view === "active" ? null : { not: null },
    ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}),
  };
  const { safe, skip } = paging(options.page);
  const [items, total] = await Promise.all([
    db.client.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip,
      take: PAGE_SIZE,
      include: { _count: { select: { pools: { where: { archivedAt: null } } } } },
    }),
    db.client.count({ where }),
  ]);
  return { items, total, page: safe, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getClient(userId: string, clientId: string) {
  if (!isUuid(clientId)) return null;
  return db.client.findFirst({ where: { id: clientId, userId }, include: { pools: { orderBy: { createdAt: "desc" } } } });
}

export async function listActiveClientOptions(userId: string) {
  return db.client.findMany({ where: { userId, archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } });
}

export async function listPools(userId: string, options: { view: RegisterView; page: number; search?: string }) {
  const search = options.search?.trim();
  const where: Prisma.PoolWhereInput = {
    userId,
    archivedAt: options.view === "active" ? null : { not: null },
    ...(search
      ? {
          OR: [
            { addressLine1: { contains: search, mode: "insensitive" } },
            { suburb: { contains: search, mode: "insensitive" } },
            { postcode: { startsWith: search } },
            { client: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const { safe, skip } = paging(options.page);
  const [items, total] = await Promise.all([
    db.pool.findMany({
      where,
      orderBy: [{ suburb: "asc" }, { addressLine1: "asc" }, { id: "asc" }],
      skip,
      take: PAGE_SIZE,
      include: { client: { select: { id: true, name: true } } },
    }),
    db.pool.count({ where }),
  ]);
  return { items, total, page: safe, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getPool(userId: string, poolId: string) {
  if (!isUuid(poolId)) return null;
  return db.pool.findFirst({ where: { id: poolId, userId }, include: { client: { select: { id: true, name: true, archivedAt: true } }, council: true } });
}

export async function countActiveBarrierRecords(userId: string) {
  const [clients, pools] = await Promise.all([
    db.client.count({ where: { userId, archivedAt: null } }),
    db.pool.count({ where: { userId, archivedAt: null } }),
  ]);
  return { clients, pools };
}

export async function listBarrierForExport(userId: string) {
  const [clients, pools] = await Promise.all([
    db.client.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, omit: { userId: true } }),
    db.pool.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, omit: { userId: true } }),
  ]);
  return { clients, pools };
}
