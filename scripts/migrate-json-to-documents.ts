/**
 * One-time import of the legacy data/*.json files into Postgres (`documents` table).
 *
 *   npx prisma db push                      # create the new tables first
 *   npx tsx scripts/migrate-json-to-documents.ts
 *
 * Safe to re-run: collections that already hold rows are skipped (use --force to overwrite).
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/db/prisma";
import { readCollection, writeCollection, writeSettings, nextSequence } from "../lib/db/store";
import { fallbackProducts } from "../lib/data";

const force = process.argv.includes("--force");
const dataDir = path.join(process.cwd(), "data");

async function main() {
  const files = fs.existsSync(dataDir) ? fs.readdirSync(dataDir).filter((f) => f.endsWith(".json")) : [];
  console.log(`Found ${files.length} JSON files in data/`);

  for (const file of files) {
    const name = file.replace(/\.json$/, "");
    const parsed = JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf-8"));

    if (name === "settings" && !Array.isArray(parsed)) {
      await writeSettings("settings", parsed);
      console.log("  settings -> __settings:settings");
      continue;
    }
    if (!Array.isArray(parsed)) {
      console.log(`  skip ${file} (not an array)`);
      continue;
    }
    const existing = await readCollection<any>(name);
    if (existing.length && !force) {
      console.log(`  skip ${name} (already has ${existing.length} rows; --force to overwrite)`);
      continue;
    }
    const rows = parsed.map((r: any, i: number) => (r && r.id ? r : { ...r, id: `${name}-${i + 1}` }));
    await writeCollection(name, rows);
    console.log(`  ${name}: ${rows.length} rows`);
  }

  // Seed the demo catalogue only if the store has no products at all.
  const products = await readCollection<any>("products");
  if (!products.length) {
    const now = new Date().toISOString();
    const seeded = fallbackProducts.map((p) => ({
      id: p.slug,
      name: p.name,
      slug: p.slug,
      type: "simple",
      status: "active",
      description: p.description,
      shortDescription: p.description,
      sku: `ZI-${p.slug.toUpperCase()}`,
      price: p.oldPrice,
      mrp: p.oldPrice,
      salePrice: p.price,
      categoryId: p.category,
      collections: p.collections ?? [],
      tags: [p.category.toLowerCase(), ...(p.badge ? [p.badge.toLowerCase()] : [])],
      images: p.images,
      taxClass: "standard",
      stock: 25,
      stockStatus: "in_stock",
      lowStockThreshold: 5,
      manageStock: true,
      backordersAllowed: false,
      attributes: { Color: p.colors, Size: p.sizes },
      variations: [],
      createdAt: now,
      updatedAt: now,
    }));
    await writeCollection("products", seeded);
    console.log(`  products: seeded ${seeded.length} starter products (edit prices/stock in the admin panel!)`);
  }

  // Order numbers continue after the highest existing ZI-xxxxx.
  const orders = await readCollection<any>("orders");
  const maxSeq = orders.reduce((m, o) => Math.max(m, Number(String(o.orderNumber || "").replace(/\D/g, "")) || 0), 9999);
  await prisma.$executeRaw`
    INSERT INTO documents (collection, id, position, data, "createdAt", "updatedAt")
    VALUES ('__counters', 'order', 0, jsonb_build_object('value', ${maxSeq}::int), now(), now())
    ON CONFLICT (collection, id) DO UPDATE
      SET data = jsonb_build_object('value', GREATEST((documents.data->>'value')::int, ${maxSeq}::int))`;
  console.log(`Order counter set; next order is ZI-${maxSeq + 1}`);
  void nextSequence;

  console.log("Done.");
}

main().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
