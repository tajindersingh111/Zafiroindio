/**
 * Copies the WordPress shop to local files, before it is replaced.
 *
 *   node scripts/backup-wordpress.mjs                 # content only (JSON), no files downloaded
 *   node scripts/backup-wordpress.mjs --media         # also download every file in the media library
 *   node scripts/backup-wordpress.mjs --media --only=product
 *
 * Everything lands under .backups/wordpress/<date>/ , which is git-ignored.
 *
 * Without credentials this takes what WordPress serves publicly: posts, pages, products, the media
 * library, categories, tags, comments, menus. Orders and customers are NOT public — set WOO_KEY and
 * WOO_SECRET (a read-only WooCommerce REST key) and they are included too.
 *
 *   WOO_URL=https://zafiroindio.com   (optional, this is the default)
 *   WOO_KEY=ck_...  WOO_SECRET=cs_...
 *
 * This is a copy of the *content*, not a restorable site backup: it has no theme files, no plugin
 * settings and no database dump. For that, use the host's own backup (cPanel / UpdraftPlus) — this
 * sits alongside it, as the part you can read and re-import without WordPress.
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const BASE = (process.env.WOO_URL || "https://zafiroindio.com").replace(/\/+$/, "");
const WITH_MEDIA = process.argv.includes("--media");
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").split("=")[1];

const { WOO_KEY, WOO_SECRET } = process.env;
const wooAuth = WOO_KEY && WOO_SECRET ? "Basic " + Buffer.from(`${WOO_KEY}:${WOO_SECRET}`).toString("base64") : null;

const OUT = path.join(process.cwd(), ".backups", "wordpress", new Date().toISOString().slice(0, 10));

/** A real browser UA and one request at a time: the old host throttles anything that looks like a bot. */
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Public WordPress collections, then the WooCommerce ones that need a key. */
const PUBLIC = ["posts", "pages", "media", "categories", "tags", "comments", "product", "product_cat", "product_tag", "nav_menu_item"];
const PRIVATE = ["orders", "customers", "products", "coupons", "reports/sales"];

async function get(url, tries = 3) {
  const headers = { "User-Agent": UA, Accept: "application/json" };
  if (wooAuth && url.includes("/wc/v3/")) headers.Authorization = wooAuth;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (attempt >= tries) throw err;
      await sleep(attempt * 3000); // backing off is what gets us past the host's rate limiter
    }
  }
}

/** Every page of a collection, saved as one JSON array. */
async function fetchCollection(namespace, resource) {
  const rows = [];
  let pageNo = 1;
  let pages = 1;
  do {
    const sep = resource.includes("?") ? "&" : "?";
    const url = `${BASE}/wp-json/${namespace}/${resource}${sep}per_page=100&page=${pageNo}${
      namespace === "wc/v3" && resource === "orders" ? "&status=any" : ""
    }`;
    const res = await get(url);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { rows, error: `HTTP ${res.status} ${body.slice(0, 160)}` };
    }
    const batch = await res.json();
    if (!Array.isArray(batch)) return { rows, error: "unexpected response shape" };
    rows.push(...batch);
    pages = Number(res.headers.get("x-wp-totalpages") || 1);
    process.stdout.write(`\r  ${resource}: ${rows.length} (page ${pageNo}/${pages})          `);
    pageNo++;
    await sleep(400);
  } while (pageNo <= pages);
  process.stdout.write("\n");
  return { rows };
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

/** The media library's actual files, kept in their original uploads/yyyy/mm layout. */
async function downloadMedia(media) {
  const dir = path.join(OUT, "uploads");
  let done = 0;
  let skipped = 0;
  let failed = 0;
  let bytes = 0;

  for (const item of media) {
    const src = item.source_url;
    if (!src) continue;
    // Keep the path WordPress serves it at, so the whole tree can be dropped onto any host.
    const rel = decodeURIComponent(new URL(src).pathname.replace(/^\/wp-content\/uploads\//, ""));
    const dest = path.join(dir, rel);

    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      skipped++;
      bytes += fs.statSync(dest).size;
      continue;
    }

    try {
      const res = await get(src);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fsp.mkdir(path.dirname(dest), { recursive: true });
      await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
      bytes += fs.statSync(dest).size;
      done++;
    } catch (err) {
      failed++;
      await fsp.appendFile(path.join(OUT, "media-failed.txt"), `${src}  ${err.message}\n`);
    }
    if ((done + skipped + failed) % 10 === 0) {
      process.stdout.write(`\r  files: ${done} downloaded, ${skipped} already here, ${failed} failed — ${mb(bytes)}        `);
    }
    await sleep(250);
  }
  process.stdout.write(`\r  files: ${done} downloaded, ${skipped} already here, ${failed} failed — ${mb(bytes)}        \n`);
  return { done, skipped, failed, bytes };
}

async function save(name, data) {
  const file = path.join(OUT, `${name.replace(/\//g, "-")}.json`);
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, JSON.stringify(data, null, 2));
  return file;
}

async function main() {
  await fsp.mkdir(OUT, { recursive: true });
  console.log(`Source: ${BASE}`);
  console.log(`Into:   ${OUT}`);
  console.log(wooAuth ? "Woo:    key present — orders and customers included\n" : "Woo:    no key — orders and customers SKIPPED\n");

  const summary = {};
  const wanted = (r) => !ONLY || r === ONLY;

  console.log("── Public content ───────────────────────────");
  for (const resource of PUBLIC.filter(wanted)) {
    const { rows, error } = await fetchCollection("wp/v2", resource);
    if (error && !rows.length) {
      console.log(`  ${resource}: skipped (${error})`);
      summary[resource] = `skipped: ${error}`;
      continue;
    }
    await save(resource, rows);
    summary[resource] = rows.length;
  }

  if (wooAuth) {
    console.log("\n── WooCommerce (needs the key) ──────────────");
    for (const resource of PRIVATE.filter(wanted)) {
      const { rows, error } = await fetchCollection("wc/v3", resource);
      if (error && !rows.length) {
        console.log(`  ${resource}: skipped (${error})`);
        summary[`wc/${resource}`] = `skipped: ${error}`;
        continue;
      }
      await save(`wc-${resource}`, rows);
      summary[`wc/${resource}`] = rows.length;
    }
  }

  if (WITH_MEDIA) {
    const mediaFile = path.join(OUT, "media.json");
    if (fs.existsSync(mediaFile)) {
      const media = JSON.parse(await fsp.readFile(mediaFile, "utf8"));
      console.log(`\n── Media files (${media.length}) ─────────────────────`);
      summary.mediaFiles = await downloadMedia(media);
    } else {
      console.log("\nNo media.json in this run, so no files were downloaded.");
    }
  }

  await save("_summary", { source: BASE, takenAt: new Date().toISOString(), withMedia: WITH_MEDIA, counts: summary });

  console.log("\n── Saved ────────────────────────────────────");
  for (const [k, v] of Object.entries(summary)) {
    console.log(`  ${k.padEnd(16)} ${typeof v === "object" ? `${v.done + v.skipped} files, ${mb(v.bytes)}` : v}`);
  }
  console.log(`\nEverything is in ${OUT}`);
  if (!wooAuth) console.log("Orders and customers need WOO_KEY / WOO_SECRET. Re-run with them set to add those.");
}

main().catch((err) => {
  console.error("\nBackup failed:", err.message);
  process.exit(1);
});
