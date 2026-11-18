/**
 * Reads the whole catalogue and reports anything a shopper would hit.
 *
 *   node scripts/audit-catalogue.mjs
 *
 * Read-only: it changes nothing. Each check prints either "ok" or the rows that fail it, so the
 * output is a list of things to fix rather than a wall of green.
 *
 * Needs DATABASE_URL.
 */

import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL.");
  process.exit(1);
}

const problems = [];
let checks = 0;

function check(title, failures, describe = (f) => f) {
  checks++;
  if (!failures.length) {
    console.log(`  ok    ${title}`);
    return;
  }
  problems.push({ title, count: failures.length });
  console.log(`  FAIL  ${title}  — ${failures.length}`);
  for (const f of failures.slice(0, 6)) console.log(`          ${describe(f)}`);
  if (failures.length > 6) console.log(`          …and ${failures.length - 6} more`);
}

const label = (p) => `${p.sku || "(no sku)"}  ${String(p.name || "").slice(0, 46)}`;
const sizeNames = (v) => (Array.isArray(v.attributes) ? v.attributes : []).map((a) => `${a.name}=${a.value}`).join(", ");
const withVarsEarly = (list) => list.filter((p) => (p.variations || []).length);

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const { rows } = await client.query(`SELECT id, data FROM documents WHERE collection = 'products'`);
  const products = rows.map((r) => ({ _id: r.id, ...r.data }));
  const { rows: catRows } = await client.query(`SELECT data FROM documents WHERE collection = 'categories'`);
  const categories = catRows.map((r) => r.data);
  const { rows: attrRows } = await client.query(`SELECT data FROM documents WHERE collection = 'attributes'`);
  const attributes = attrRows.map((r) => r.data);

  const active = products.filter((p) => (p.status ?? "active") === "active");
  const variable = active.filter((p) => p.type === "variable");
  const simple = active.filter((p) => p.type !== "variable");

  console.log(`Products ${products.length}  (active ${active.length}: ${simple.length} simple, ${variable.length} variable)`);
  console.log(`Categories ${categories.length}   Attributes ${attributes.length}\n`);

  // ── The basics every product needs ────────────────────────────────
  console.log("Every product");
  check("has a name", active.filter((p) => !String(p.name || "").trim()), (p) => p._id);
  check("has a slug", active.filter((p) => !String(p.slug || "").trim()), label);
  check("has a SKU", active.filter((p) => !String(p.sku || "").trim()), label);
  check("has at least one image", active.filter((p) => !(p.images || []).length), label);
  check("has a category that exists", active.filter((p) => !categories.some((c) => c.id === p.categoryId)), (p) => `${label(p)} → categoryId ${p.categoryId}`);
  check("has stock", active.filter((p) => !Number.isFinite(Number(p.stock))), label);

  const bySlug = new Map();
  for (const p of active) bySlug.set(p.slug, (bySlug.get(p.slug) || 0) + 1);
  check("slug is unique", [...bySlug].filter(([, n]) => n > 1), ([s, n]) => `${s} × ${n}`);

  const bySku = new Map();
  for (const p of active) if (p.sku) bySku.set(p.sku, (bySku.get(p.sku) || 0) + 1);
  check("SKU is unique", [...bySku].filter(([, n]) => n > 1), ([s, n]) => `${s} × ${n}`);

  // ── Money ─────────────────────────────────────────────────────────
  console.log("\nPrices");
  check("simple product has a price above zero", simple.filter((p) => !(Number(p.price) > 0)), (p) => `${label(p)} → ${p.price}`);
  /**
   * The WooCommerce import left many products with price and salePrice swapped, which lib/price-rules
   * already compensates for: the customer pays the lower of the two and the struck-through figure is
   * the highest known one. So the question is not whether the columns look tidy — it is whether those
   * rules produce a sane pair, which is what the shopper actually sees.
   */
  const pos = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
  const selling = (p) => (pos(p.salePrice) && pos(p.price) ? Math.min(pos(p.salePrice), pos(p.price)) : pos(p.salePrice) || pos(p.price));
  const listed = (p) => Math.max(pos(p.mrp), pos(p.price), pos(p.salePrice));

  check("the price a shopper pays is above zero", simple.filter((p) => !(selling(p) > 0)), (p) => `${label(p)} → ${selling(p)}`);
  check(
    "the struck-through price is never below it",
    active.filter((p) => listed(p) > 0 && listed(p) < selling(p)),
    (p) => `${label(p)} → was ${listed(p)}, now ${selling(p)}`
  );
  check(
    "no discount looks absurd (over 95%)",
    active.filter((p) => selling(p) > 0 && listed(p) > 0 && (listed(p) - selling(p)) / listed(p) > 0.95),
    (p) => `${label(p)} → ${listed(p)} → ${selling(p)}`
  );
  check(
    "every variation priced above zero after the rules",
    withVarsEarly(active).filter((p) => p.variations.some((v) => !(selling(v) > 0))),
    label
  );

  // ── Variable products: the part that decides whether they sell ────
  console.log("\nVariable products");
  check("has variations", variable.filter((p) => !(p.variations || []).length), label);

  const withVars = variable.filter((p) => (p.variations || []).length);
  check(
    "every variation carries an attribute",
    withVars.filter((p) => p.variations.some((v) => !(v.attributes || []).length)),
    label
  );
  check(
    "every variation has a price above zero",
    withVars.filter((p) => p.variations.some((v) => !(Number(v.salePrice || v.price) > 0))),
    (p) => `${label(p)} → ${p.variations.filter((v) => !(Number(v.salePrice || v.price) > 0)).map(sizeNames).join("; ")}`
  );
  check(
    "no two variations offer the same option",
    withVars.filter((p) => {
      const seen = new Set();
      return p.variations.some((v) => {
        const k = sizeNames(v).toLowerCase();
        if (seen.has(k)) return true;
        seen.add(k);
        return false;
      });
    }),
    label
  );
  check(
    "at least one variation is in stock",
    withVars.filter((p) => !p.variations.some((v) => Number(v.stock) > 0)),
    label
  );
  check(
    "variation SKUs are filled in",
    withVars.filter((p) => p.variations.some((v) => !String(v.sku || "").trim())),
    label
  );

  /**
   * The storefront builds the option list from `attributes`, falling back to reading it off the
   * variations. A product passes if either route produces options, because that is what the shopper
   * actually gets to click.
   */
  const optionsFor = (p) => {
    const attrs = p.attributes || {};
    const fromAttrs = Object.entries(attrs).flatMap(([k, vals]) =>
      /size|color|colour/i.test(k) ? (Array.isArray(vals) ? vals : []) : []
    );
    if (fromAttrs.length) return fromAttrs;
    const out = new Set();
    for (const v of p.variations || []) for (const a of v.attributes || []) if (a.value) out.add(String(a.value));
    return [...out];
  };
  check("the shopper is offered something to choose", withVars.filter((p) => !optionsFor(p).length), label);

  check(
    "every offered option maps to a variation",
    withVars.filter((p) => {
      const values = new Set((p.variations || []).flatMap((v) => (v.attributes || []).map((a) => String(a.value).toLowerCase())));
      return optionsFor(p).some((o) => !values.has(String(o).toLowerCase()));
    }),
    (p) => {
      const values = new Set((p.variations || []).flatMap((v) => (v.attributes || []).map((a) => String(a.value).toLowerCase())));
      return `${label(p)} → ${optionsFor(p).filter((o) => !values.has(String(o).toLowerCase())).join(", ")}`;
    }
  );

  // ── Images on disk ────────────────────────────────────────────────
  console.log("\nImages");
  const allImages = new Set();
  for (const p of active) {
    for (const i of p.images || []) allImages.add(i);
    for (const v of p.variations || []) if (v.image) allImages.add(v.image);
  }
  const remote = [...allImages].filter((i) => /^https?:/i.test(i));
  const localMissing = [...allImages].filter((i) => i.startsWith("/") && !fs.existsSync(path.join(process.cwd(), "public", decodeURI(i))));
  check("no image is still fetched from another site", remote, (i) => i.slice(0, 80));
  check("every local image has a file", localMissing, (i) => i);

  // ── Attributes ────────────────────────────────────────────────────
  console.log("\nAttributes");
  const names = attributes.map((a) => String(a.name || "").trim());
  const dupes = names.filter((n, i) => names.findIndex((m) => m.toLowerCase().replace(/s$/, "") === n.toLowerCase().replace(/s$/, "")) !== i);
  check("no two attributes mean the same thing", dupes, (n) => `"${n}" duplicates an existing attribute`);
  check("every attribute has values", attributes.filter((a) => !(a.values || []).length), (a) => a.name);

  // ── Verdict ───────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(60)}`);
  if (!problems.length) {
    console.log(`All ${checks} checks passed.`);
  } else {
    console.log(`${checks - problems.length} of ${checks} checks passed. ${problems.length} to look at:`);
    for (const p of problems) console.log(`  • ${p.title} (${p.count})`);
  }

  await client.end();
}

main().catch((err) => {
  console.error("\nAudit failed:", err.message);
  process.exit(1);
});
