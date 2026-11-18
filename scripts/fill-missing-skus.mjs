/**
 * Gives every product and variation a SKU, and merges the duplicate size attribute.
 *
 *   node scripts/fill-missing-skus.mjs            # show what it would set
 *   node scripts/fill-missing-skus.mjs --write    # set it
 *
 * 27 products and 13 sets of variations have no SKU — and neither did they in WooCommerce, so there
 * is nothing to import. Without one, stock cannot be counted against anything, the courier has no
 * item code and the invoice line is blank, which is what makes inventory feel broken.
 *
 * The codes are built from the product's own category and name, so they read as themselves:
 *   Teal Hand Block Cotton Rug, 4 ft * 6 ft  →  RUG-TEAL-4X6
 * They are stable (the same product always gets the same code) and unique, and anything already
 * carrying a SKU is left alone — a code someone has printed or sent to a courier never changes.
 *
 * Needs DATABASE_URL.
 */

import { Client } from "pg";

const WRITE = process.argv.includes("--write");
const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL.");
  process.exit(1);
}

/** Short, pronounceable prefixes for the categories the shop actually sells. */
const PREFIX = [
  [/rug/i, "RUG"],
  [/sofa.*throw|throw/i, "THRW"],
  [/quilt/i, "QLT"],
  [/dining|table.*runner|runner|placemat|table.*mat|table.*cover/i, "TBL"],
  [/bedsheet|bed sheet|bedding|dohar/i, "BED"],
  [/cushion|pillow/i, "CSH"],
];

const words = (s) =>
  String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/** The part of a product name that identifies it — the colour or motif, not the material. */
const NOISE = /^(hand|handblock|block|print|printed|cotton|pure|exclusive|set|sets|the|with|and|tc|inches|inch|in|size|handcrafted|export|bedsheet|bed|sheet|rug|rugs|throw|throws|table|runner|runners|placemat|placemats|cover|covers|quilted|bedcover|bedcovers|dining|sofa|mat|mats|gifting|lace|pillow)$/i;

function prefixFor(p) {
  const hay = `${p.categoryName || ""} ${p.name || ""}`;
  for (const [re, code] of PREFIX) if (re.test(hay)) return code;
  return "ZI";
}

function distinctive(name) {
  const parts = words(name).filter((w) => !NOISE.test(w) && !/^\d+$/.test(w));
  return (parts[0] || words(name)[0] || "ITEM").toUpperCase().slice(0, 8);
}

/** "4 ft * 6 ft" → "4X6"; "SUPER KING (112*112 INCHES)" → "SUPERKING"; "6 Seater" → "6S". */
function optionCode(value) {
  const v = String(value || "").trim();
  const feet = v.match(/(\d+)\s*(?:ft|feet|')\s*[*xX×]\s*(\d+)\s*(?:ft|feet|')?/);
  if (feet) return `${feet[1]}X${feet[2]}`;
  const seater = v.match(/(\d+)\s*seater/i);
  if (seater) return `${seater[1]}S`;
  const inches = v.match(/(\d+)\s*[*xX×]\s*(\d+)/);
  const head = words(v.replace(/\(.*?\)/g, ""))
    .join("")
    .toUpperCase()
    .slice(0, 10);
  return head || (inches ? `${inches[1]}X${inches[2]}` : "STD");
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const { rows } = await client.query(`SELECT id, data FROM documents WHERE collection = 'products'`);
  const products = rows.map((r) => ({ _row: r.id, ...r.data }));

  // Everything already in use, so a generated code can never collide with one.
  const taken = new Set();
  for (const p of products) {
    if (p.sku) taken.add(String(p.sku).toUpperCase());
    for (const v of p.variations || []) if (v.sku) taken.add(String(v.sku).toUpperCase());
  }

  const unique = (base) => {
    let code = base;
    for (let n = 2; taken.has(code.toUpperCase()); n++) code = `${base}-${n}`;
    taken.add(code.toUpperCase());
    return code;
  };

  const planned = [];
  for (const p of products) {
    const needsProduct = !String(p.sku || "").trim();
    const variations = p.variations || [];
    const needsVariations = variations.some((v) => !String(v.sku || "").trim());
    if (!needsProduct && !needsVariations) continue;

    const productSku = needsProduct ? unique(`${prefixFor(p)}-${distinctive(p.name)}`) : p.sku;
    const newVariations = variations.map((v) => {
      if (String(v.sku || "").trim()) return v;
      const option = (v.attributes || []).map((a) => optionCode(a.value)).filter(Boolean).join("-");
      return { ...v, sku: unique(`${productSku}${option ? `-${option}` : ""}`) };
    });

    planned.push({ row: p._row, name: p.name, productSku, needsProduct, newVariations, changedVariations: needsVariations });
  }

  console.log(`Products: ${products.length}`);
  console.log(`Needing a code: ${planned.length}\n`);
  for (const i of planned.slice(0, 8)) {
    console.log(`  ${String(i.name).slice(0, 44).padEnd(46)} ${i.productSku}`);
    for (const v of i.newVariations.slice(0, 4)) {
      console.log(`      ${(v.attributes || []).map((a) => a.value).join(", ").slice(0, 34).padEnd(36)} ${v.sku}`);
    }
  }
  if (planned.length > 8) console.log(`  …and ${planned.length - 8} more`);

  // ── The duplicate size attribute ──────────────────────────────────
  const { rows: attrRows } = await client.query(`SELECT id, data FROM documents WHERE collection = 'attributes'`);
  const dupes = attrRows.filter((a) => /^sizes$/i.test(String(a.data.name || "").trim()));
  const keeper = attrRows.find((a) => /^size$/i.test(String(a.data.name || "").trim()));
  console.log(
    `\nDuplicate size attribute: ${dupes.length && keeper ? `"${dupes[0].data.name}" will be folded into "${keeper.data.name}"` : "none"}`
  );

  if (!WRITE) {
    await client.end();
    return console.log("\nNothing written. Re-run with --write to apply.");
  }

  await client.query("BEGIN");
  let p1 = 0;
  let p2 = 0;
  for (const i of planned) {
    if (i.needsProduct) {
      await client.query(`UPDATE documents SET data = jsonb_set(data, '{sku}', $1::jsonb), "updatedAt" = now() WHERE collection='products' AND id=$2`, [
        JSON.stringify(i.productSku),
        i.row,
      ]);
      p1++;
    }
    if (i.changedVariations) {
      await client.query(
        `UPDATE documents SET data = jsonb_set(data, '{variations}', $1::jsonb), "updatedAt" = now() WHERE collection='products' AND id=$2`,
        [JSON.stringify(i.newVariations), i.row]
      );
      p2++;
    }
  }

  // The size list the admin offers should name one thing once. The values on products are left as
  // they are: the storefront matches any attribute whose name contains "size", so nothing shifts.
  let merged = 0;
  if (keeper && dupes.length) {
    const keepValues = new Set((keeper.data.values || []).map(String));
    for (const d of dupes) for (const v of d.data.values || []) keepValues.add(String(v));
    await client.query(`UPDATE documents SET data = jsonb_set(data, '{values}', $1::jsonb), "updatedAt" = now() WHERE collection='attributes' AND id=$2`, [
      JSON.stringify([...keepValues]),
      keeper.id,
    ]);
    for (const d of dupes) {
      await client.query(`DELETE FROM documents WHERE collection='attributes' AND id=$1`, [d.id]);
      merged++;
    }
  }
  await client.query("COMMIT");

  console.log(`\nWritten: ${p1} product codes, ${p2} products' variation codes, ${merged} duplicate attribute removed.`);
  await client.end();
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
