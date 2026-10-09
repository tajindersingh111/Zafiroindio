import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { storefrontChanged } from "@/lib/storefront/revalidate";

/**
 * Postgres-backed document store.
 *
 * Every record is its own row in the `documents` table (collection + id), so updates are
 * per-record and atomic. This replaces the old JSON-file store, which lost data on serverless /
 * container restarts and lost concurrent writes (read-modify-write of a whole file).
 */

type Doc = Record<string, unknown> & { id?: string };

const SETTINGS_ID = "singleton";

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function docId(doc: Doc, index: number): string {
  return typeof doc.id === "string" && doc.id ? doc.id : `item-${index}`;
}

/** Hash a collection name to a 32-bit int for pg_advisory_xact_lock. */
function lockKey(collection: string): number {
  let h = 0;
  for (let i = 0; i < collection.length; i++) h = (h * 31 + collection.charCodeAt(i)) | 0;
  return h;
}

type Tx = Prisma.TransactionClient;

async function lockCollection(tx: Tx, collection: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey(collection)})`;
}

async function readAll<T>(client: Tx | typeof prisma, collection: string): Promise<T[]> {
  const rows = await client.document.findMany({
    where: { collection },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    select: { data: true },
  });
  return rows.map((r) => r.data as unknown as T);
}

async function replaceAll(tx: Tx, collection: string, items: Doc[]) {
  const existing = await tx.document.findMany({
    where: { collection },
    select: { id: true, position: true, data: true },
  });
  const existingMap = new Map(existing.map((e) => [e.id, e]));
  const seen = new Set<string>();
  const creates: Prisma.DocumentCreateManyInput[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const id = docId(item, i);
    seen.add(id);
    const current = existingMap.get(id);
    if (!current) {
      creates.push({ collection, id, position: i, data: toJson(item) });
      continue;
    }
    if (current.position !== i || JSON.stringify(current.data) !== JSON.stringify(item)) {
      await tx.document.update({
        where: { collection_id: { collection, id } },
        data: { position: i, data: toJson(item) },
      });
    }
  }

  if (creates.length) await tx.document.createMany({ data: creates, skipDuplicates: true });

  const removed = existing.filter((e) => !seen.has(e.id)).map((e) => e.id);
  if (removed.length) await tx.document.deleteMany({ where: { collection, id: { in: removed } } });
}

/** Read every record of a collection (newest-first ordering is preserved from writeCollection). */
export async function readCollection<T>(collection: string): Promise<T[]> {
  return readAll<T>(prisma, collection);
}

/** Replace a whole collection. Prefer mutateCollection / upsertDoc for read-modify-write. */
export async function writeCollection<T>(collection: string, data: T[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await lockCollection(tx, collection);
    await replaceAll(tx, collection, data as unknown as Doc[]);
  });
  storefrontChanged(collection);
}

/**
 * Safe read-modify-write: the collection is locked for the duration of `fn`, so two
 * concurrent requests can never overwrite each other.
 */
export async function mutateCollection<T, R = void>(
  collection: string,
  fn: (items: T[]) => Promise<R> | R
): Promise<R> {
  const result = await prisma.$transaction(
    async (tx) => {
      await lockCollection(tx, collection);
      const items = await readAll<T>(tx, collection);
      const result = await fn(items);
      await replaceAll(tx, collection, items as unknown as Doc[]);
      return result;
    },
    { timeout: 20_000, maxWait: 10_000 }
  );
  storefrontChanged(collection);
  return result;
}

export async function getDoc<T>(collection: string, id: string): Promise<T | null> {
  const row = await prisma.document.findUnique({ where: { collection_id: { collection, id } } });
  return row ? (row.data as unknown as T) : null;
}

/** Insert or replace one record. New records appear first (like the old `unshift`). */
export async function upsertDoc<T extends { id: string }>(collection: string, doc: T): Promise<T> {
  await prisma.document.upsert({
    where: { collection_id: { collection, id: doc.id } },
    create: { collection, id: doc.id, position: -Math.floor(Date.now() / 1000), data: toJson(doc) },
    update: { data: toJson(doc) },
  });
  return doc;
}

/**
 * Row-locked read-modify-write of ONE record (SELECT ... FOR UPDATE). Two requests touching the
 * same order can never interleave. Return the new document, or `null` to leave it untouched.
 * `fn` receives the transaction so stock changes commit or roll back together with the record.
 */
export async function updateDoc<T extends { id: string }, R = void>(
  collection: string,
  id: string,
  fn: (doc: T, tx: Tx) => Promise<{ doc: T | null; result: R }> | { doc: T | null; result: R }
): Promise<{ found: boolean; result: R | undefined }> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ data: T }[]>`
      SELECT data FROM documents WHERE collection = ${collection} AND id = ${id} FOR UPDATE`;
    if (!rows.length) return { found: false, result: undefined };
    const { doc, result } = await fn(rows[0].data, tx);
    if (doc) {
      await tx.document.update({
        where: { collection_id: { collection, id } },
        data: { data: toJson(doc) },
      });
    }
    return { found: true, result };
  }, { timeout: 20_000, maxWait: 10_000 });
}

export async function findOneByField<T>(collection: string, field: string, value: string | number | boolean): Promise<T | null> {
  const row = await prisma.document.findFirst({
    where: { collection, data: { path: [field], equals: value } },
    select: { data: true },
  });
  return row ? (row.data as unknown as T) : null;
}

export async function deleteDoc(collection: string, id: string): Promise<boolean> {
  const res = await prisma.document.deleteMany({ where: { collection, id } });
  return res.count > 0;
}

export async function findDocs<T>(
  collection: string,
  filter: Prisma.JsonFilter<"Document"> & { path: string[] },
  limit = 200
): Promise<T[]> {
  const rows = await prisma.document.findMany({
    where: { collection, data: filter },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    take: limit,
    select: { data: true },
  });
  return rows.map((r) => r.data as unknown as T);
}

/** Newest-first slice of a collection (use for logs instead of loading everything). */
export async function listDocs<T>(collection: string, limit = 200): Promise<T[]> {
  const rows = await prisma.document.findMany({
    where: { collection },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    take: limit,
    select: { data: true },
  });
  return rows.map((r) => r.data as unknown as T);
}

export async function countDocs(collection: string): Promise<number> {
  return prisma.document.count({ where: { collection } });
}

/** Singleton settings object (store settings, meta config, goals ...). */
export async function readSettings<T>(key: string): Promise<T | null> {
  return getDoc<T>(`__settings:${key}`, SETTINGS_ID);
}

export async function writeSettings<T>(key: string, data: T): Promise<void> {
  const collection = `__settings:${key}`;
  await prisma.document.upsert({
    where: { collection_id: { collection, id: SETTINGS_ID } },
    create: { collection, id: SETTINGS_ID, data: toJson(data) },
    update: { data: toJson(data) },
  });
}

/** Atomic sequence counter (order numbers, invoice numbers ...). */
export async function nextSequence(name: string, start = 1000): Promise<number> {
  const rows = await prisma.$queryRaw<{ value: number }[]>`
    INSERT INTO documents (collection, id, position, data, "createdAt", "updatedAt")
    VALUES ('__counters', ${name}, 0, jsonb_build_object('value', ${start}::int), now(), now())
    ON CONFLICT (collection, id) DO UPDATE
      SET data = jsonb_build_object('value', (documents.data->>'value')::int + 1), "updatedAt" = now()
    RETURNING (data->>'value')::int AS value`;
  return rows[0].value;
}

export type StockResult = { ok: true; stock: number } | { ok: false; reason: "not_found" | "insufficient"; stock?: number };

/**
 * Atomically take `qty` units from a product. The UPDATE only succeeds while enough stock is left,
 * so concurrent checkouts can never oversell. Products with manageStock=false are never limited.
 */
export async function decrementProductStock(productId: string, qty: number, client: Tx | typeof prisma = prisma): Promise<StockResult> {
  const rows = await client.$queryRaw<{ stock: number }[]>`
    UPDATE documents SET
      data = jsonb_set(
               jsonb_set(data, '{stock}', to_jsonb((data->>'stock')::int - ${qty}::int)),
               '{stockStatus}',
               to_jsonb(CASE
                 WHEN (data->>'stock')::int - ${qty}::int <= 0 THEN 'out_of_stock'
                 WHEN (data->>'stock')::int - ${qty}::int <= COALESCE((data->>'lowStockThreshold')::int, 5) THEN 'low_stock'
                 ELSE 'in_stock' END)),
      "updatedAt" = now()
    WHERE collection = 'products' AND id = ${productId}
      AND (data->>'manageStock') IS DISTINCT FROM 'false'
      AND (data->>'stock')::int >= ${qty}::int
    RETURNING (data->>'stock')::int AS stock`;
  if (rows.length) return { ok: true, stock: rows[0].stock };

  const existing = await client.document.findUnique({ where: { collection_id: { collection: "products", id: productId } } });
  if (!existing) return { ok: false, reason: "not_found" };
  const data = existing.data as { manageStock?: boolean; stock?: number };
  if (data.manageStock === false) return { ok: true, stock: Number(data.stock ?? 0) };
  return { ok: false, reason: "insufficient", stock: Number(data.stock ?? 0) };
}

/** Give stock back (cancelled / failed / stale orders). */
export async function restoreProductStock(productId: string, qty: number, client: Tx | typeof prisma = prisma): Promise<void> {
  await client.$executeRaw`
    UPDATE documents SET
      data = jsonb_set(
               jsonb_set(data, '{stock}', to_jsonb(COALESCE((data->>'stock')::int, 0) + ${qty}::int)),
               '{stockStatus}',
               to_jsonb(CASE
                 WHEN COALESCE((data->>'stock')::int, 0) + ${qty}::int <= 0 THEN 'out_of_stock'
                 WHEN COALESCE((data->>'stock')::int, 0) + ${qty}::int <= COALESCE((data->>'lowStockThreshold')::int, 5) THEN 'low_stock'
                 ELSE 'in_stock' END)),
      "updatedAt" = now()
    WHERE collection = 'products' AND id = ${productId}
      AND (data->>'manageStock') IS DISTINCT FROM 'false'`;
}

export { prisma };
