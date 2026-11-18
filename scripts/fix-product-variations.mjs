/**
 * Gives the variable products their sizes back.
 *
 *   node scripts/fix-product-variations.mjs            # report what is missing and what would be set
 *   node scripts/fix-product-variations.mjs --write    # apply it
 *
 * 26 products in the shop are typed "variable" but carry no variations at all, which means the
 * product page has no size to choose and nothing can be added to the cart — they are unbuyable. The
 * old WooCommerce shop still has every one of them, so each product's variations and its visible
 * attributes are read from there and written onto the matching product here.
 *
 * Products are matched on SKU first, then on slug, then on name. Anything that cannot be matched is
 * listed rather than guessed at, and a product that already has variations is left untouched.
 *
 * Needs DATABASE_URL, WOO_URL, WOO_KEY, WOO_SECRET.
 */

import crypto from "node:crypto";
import { Client } from "pg";

const WRITE = process.argv.includes("--write");
const { DATABASE_URL, WOO_URL = "https://zafiroindio.com", WOO_KEY, WOO_SECRET } = process.env;
for (const [k, v] of Object.entries({ DATABASE_URL, WOO_KEY, WOO_SECRET })) {
  if (!v) {
    console.error(`Missing ${k}.`);
    process.exit(1);
  }
}

const auth = "Basic " + Buffer.from(`${WOO_KEY}:${WOO_SECRET}`).toString("base64");
const base = WOO_URL.replace(/\/+$/, "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function woo(resource) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${base}/wp-json/wc/v3/${resource}`, { headers: { Authorization: auth, Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (err) {
      if (attempt >= 3) throw err;
      await sleep(attempt * 2000);
    }
  }
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const norm = (s) => String(s ?? "").toLowerCase().replace(/&amp;/g, "&").replace(/[^a-z0-9]+/g, "");

/** Woo's stock_status, in this shop's words. */
function stockStatus(v, qty) {
  if (v.stock_status === "outofstock") return "out_of_stock";
  if (v.stock_status === "onbackorder") return "on_backorder";
  return qty > 0 && qty <= 5 ? "low_stock" : "in_stock";
}

/**
 * A stable id per variation, so running this twice does not change the ids the cart may hold.
 * Woo's own variation id is unique and permanent, which is exactly what is wanted.
 */
const variationId = (wooId) => crypto.createHash("sha1").update(`wc-variation-${wooId}`).digest("hex").slice(0, 32);

function mapVariation(v) {
  const stock = v.manage_stock ? num(v.stock_quantity) : 5;
  return {
    id: variationId(v.id),
    sku: v.sku || "",
    attributes: (v.attributes || []).map((a) => ({ name: a.name || "Option", value: a.option || "" })).filter((a) => a.value),
    price: num(v.regular_price) || num(v.price),
    salePrice: v.sale_price ? num(v.sale_price) : undefined,
    stock,
    stockStatus: stockStatus(v, stock),
    image: v.image?.src || undefined,
    weight: v.weight ? num(v.weight) : undefined,
  };
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const { rows } = await client.query(`SELECT id, data FROM documents WHERE collection = 'products'`);
  const broken = rows.filter((r) => r.data.type === "variable" && !(r.data.variations || []).length);
  console.log(`Products in the shop: ${rows.length}`);
  console.log(`Variable with no variations: ${broken.length}\n`);

  if (!broken.length) {
    await client.end();
    return console.log("Nothing to do.");
  }

  console.log("Reading the old shop…");
  const wooProducts = [];
  for (let page = 1; ; page++) {
    const batch = await woo(`products?per_page=100&page=${page}&status=any`);
    wooProducts.push(...batch);
    if (batch.length < 100) break;
    await sleep(300);
  }
  console.log(`  ${wooProducts.length} products there\n`);

  // Three ways to recognise the same product, tried in order of how much they prove.
  const bySku = new Map(), bySlug = new Map(), byName = new Map();
  for (const w of wooProducts) {
    if (w.sku) bySku.set(norm(w.sku), w);
    if (w.slug) bySlug.set(norm(w.slug), w);
    if (w.name) byName.set(norm(w.name), w);
  }

  const planned = [];
  const unmatched = [];
  for (const row of broken) {
    const p = row.data;
    const match =
      (p.sku && bySku.get(norm(p.sku))) || (p.slug && bySlug.get(norm(p.slug))) || (p.name && byName.get(norm(p.name)));
    if (!match) {
      unmatched.push(`${p.sku || "(no sku)"} — ${String(p.name).slice(0, 48)}`);
      continue;
    }
    planned.push({ row, woo: match });
  }

  console.log(`Matched to the old shop: ${planned.length}`);
  if (unmatched.length) {
    console.log(`Not matched: ${unmatched.length}`);
    for (const u of unmatched) console.log(`   ${u}`);
  }

  console.log("\nFetching variations…");
  let noVariations = 0;
  for (const item of planned) {
    const list = await woo(`products/${item.woo.id}/variations?per_page=100`);
    item.variations = list.map(mapVariation).filter((v) => v.attributes.length);
    // Only the attributes Woo marks as shown on the product page.
    item.attributes = Object.fromEntries(
      (item.woo.attributes || []).filter((a) => a.visible || a.variation).map((a) => [a.name || "Option", a.options || []])
    );
    if (!item.variations.length) noVariations++;
    process.stdout.write(`\r  ${planned.indexOf(item) + 1}/${planned.length}   `);
    await sleep(250);
  }
  process.stdout.write("\n");

  const usable = planned.filter((i) => i.variations.length);
  console.log(`\nWith variations to write: ${usable.length}`);
  if (noVariations) console.log(`Variable in Woo but with none defined there either: ${noVariations}`);

  console.log("\nExamples:");
  for (const i of usable.slice(0, 5)) {
    const sizes = i.variations.map((v) => v.attributes.map((a) => a.value).join("/")).join(", ");
    console.log(`  ${String(i.row.data.name).slice(0, 42).padEnd(44)} ${i.variations.length} → ${sizes}`);
  }

  if (!WRITE) {
    await client.end();
    return console.log("\nNothing written. Re-run with --write to apply.");
  }

  await client.query("BEGIN");
  let written = 0;
  for (const i of usable) {
    /**
     * Only the two keys are set, rather than the whole document being written back. The row was
     * read at the start of this run, so writing all of it would undo anything else that touched
     * the product meanwhile — the image rewrite, or a change made in admin.
     */
    const fillAttributes = !i.row.data.attributes || Object.keys(i.row.data.attributes).length === 0;
    await client.query(
      `UPDATE documents
          SET data = jsonb_set(
                       CASE WHEN $3::bool THEN jsonb_set(data, '{attributes}', $2::jsonb) ELSE data END,
                       '{variations}', $1::jsonb),
              "updatedAt" = now()
        WHERE collection = 'products' AND id = $4`,
      [
        JSON.stringify(i.variations).replace(/\\u0000/g, ""),
        JSON.stringify(i.attributes).replace(/\\u0000/g, ""),
        fillAttributes,
        i.row.id,
      ]
    );
    written++;
  }
  await client.query("COMMIT");
  console.log(`\nWritten: ${written} products now have their sizes.`);

  const { rows: left } = await client.query(
    `SELECT count(*)::int AS n FROM documents WHERE collection='products' AND data->>'type'='variable' AND coalesce(jsonb_array_length(data->'variations'),0)=0`
  );
  console.log(`Still variable with no variations: ${left[0].n}`);
  await client.end();
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
