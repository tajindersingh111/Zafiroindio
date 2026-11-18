/**
 * Brings the shop's photographs home, off the WordPress media server.
 *
 *   node scripts/localise-product-images.mjs            # build the files, report, change nothing
 *   node scripts/localise-product-images.mjs --write    # also repoint the database
 *
 * Every image the shop shows is still served from zafiroindio.com/wp-content/uploads, so the day
 * WordPress is switched off the catalogue loses its pictures. This reads each one from the backup
 * taken earlier (downloading the few the backup missed), resizes it to a sane width, writes a WebP
 * into public/products/, and — with --write — rewrites every URL in the database to the local path.
 *
 * Needs DATABASE_URL. Re-running is safe: a file already built is left alone, and the database
 * update only ever touches URLs that still point at WordPress.
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { Client } from "pg";

const WRITE = process.argv.includes("--write");
const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL.");
  process.exit(1);
}

const BACKUP = path.join(process.cwd(), ".backups", "wordpress", "2026-11-18", "uploads");
const OUT_DIR = path.join(process.cwd(), "public", "products");
const PUBLIC_PREFIX = "/products";

/** Wide enough for the hero and the product page on a retina screen; far below the 2560px originals. */
const MAX_WIDTH = 1600;
const QUALITY = 82;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * One stable file name per source image.
 *
 * The originals carry curly quotes and spaces, and the same picture appears in the database both
 * percent-encoded and raw — so the name is built from the decoded path, and a hash of that path
 * keeps two different pictures with the same words apart.
 */
function localName(uploadsPath) {
  const stem = path
    .basename(uploadsPath, path.extname(uploadsPath))
    .normalize("NFKD")
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 60);
  const hash = crypto.createHash("sha1").update(uploadsPath).digest("hex").slice(0, 8);
  return `${stem || "image"}-${hash}.webp`;
}

/** The uploads-relative path a URL points at, with its encoding undone. */
function uploadsPathOf(url) {
  const { pathname } = new URL(url);
  return decodeURIComponent(pathname.replace(/^\/wp-content\/uploads\//, ""));
}

async function sourceBytes(url, uploadsPath) {
  const onDisk = path.join(BACKUP, uploadsPath);
  if (fs.existsSync(onDisk) && fs.statSync(onDisk).size > 0) return { buf: await fsp.readFile(onDisk), from: "backup" };

  // The handful the backup missed, fetched now while the old site is still up.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (!buf.length) throw new Error("empty body");
      return { buf, from: "downloaded" };
    } catch (err) {
      if (attempt === 3) return { error: err.message };
      await sleep(attempt * 2000);
    }
  }
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

async function main() {
  const urls = (await fsp.readFile(path.join(process.cwd(), ".backups", "wp-urls.txt"), "utf8"))
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  console.log(`Images to bring home: ${urls.length}`);
  await fsp.mkdir(OUT_DIR, { recursive: true });

  /** url → public path. Two URLs for the same file map to the same local image. */
  const map = {};
  let built = 0;
  let reused = 0;
  let downloaded = 0;
  let failed = 0;
  let before = 0;
  let after = 0;
  const problems = [];

  for (const url of urls) {
    let uploadsPath;
    try {
      uploadsPath = uploadsPathOf(url);
    } catch {
      problems.push(`unparseable URL: ${url}`);
      failed++;
      continue;
    }

    const name = localName(uploadsPath);
    const dest = path.join(OUT_DIR, name);
    map[url] = `${PUBLIC_PREFIX}/${name}`;

    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      reused++;
      after += fs.statSync(dest).size;
      continue;
    }

    const got = await sourceBytes(url, uploadsPath);
    if (got.error) {
      problems.push(`${got.error}  ${uploadsPath}`);
      delete map[url]; // leave this one pointing at WordPress rather than at nothing
      failed++;
      continue;
    }
    if (got.from === "downloaded") downloaded++;
    before += got.buf.length;

    try {
      await sharp(got.buf)
        .rotate() // honour the EXIF orientation before it is stripped
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(dest);
      after += fs.statSync(dest).size;
      built++;
    } catch (err) {
      problems.push(`convert failed: ${err.message}  ${uploadsPath}`);
      delete map[url];
      failed++;
      continue;
    }

    if ((built + reused) % 20 === 0) process.stdout.write(`\r  built ${built}, reused ${reused}, failed ${failed}   `);
  }

  process.stdout.write("\n");
  console.log(`\n built        ${built}${downloaded ? ` (${downloaded} fetched from the live site)` : ""}`);
  console.log(` already here ${reused}`);
  console.log(` failed       ${failed}`);
  if (before) console.log(` size         ${mb(before)} → ${mb(after)}`);
  if (problems.length) {
    console.log("\n problems:");
    for (const p of problems.slice(0, 10)) console.log(`   ${p}`);
    if (problems.length > 10) console.log(`   …and ${problems.length - 10} more`);
  }

  await fsp.writeFile(path.join(process.cwd(), ".backups", "image-map.json"), JSON.stringify(map, null, 2));

  if (!WRITE) {
    console.log(`\nFiles are in public/products/. Nothing in the database was changed — re-run with --write for that.`);
    return;
  }

  // ── Repoint the database ───────────────────────────────────────────
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT collection, id, data::text AS text FROM documents WHERE data::text LIKE '%zafiroindio.com/wp-content/uploads/%'`
    );
    console.log(`\nDocuments mentioning the old media server: ${rows.length}`);

    let changed = 0;
    const perCollection = {};
    await client.query("BEGIN");
    for (const row of rows) {
      let text = row.text;
      for (const [url, local] of Object.entries(map)) {
        if (!text.includes(url)) continue;
        // The document is JSON text, so a URL with a "/" in it is stored escaped as well.
        text = text.split(url).join(local).split(url.replace(/\//g, "\\/")).join(local);
      }
      if (text === row.text) continue;
      await client.query(`UPDATE documents SET data = $1::jsonb, "updatedAt" = now() WHERE collection = $2 AND id = $3`, [
        text,
        row.collection,
        row.id,
      ]);
      perCollection[row.collection] = (perCollection[row.collection] || 0) + 1;
      changed++;
    }
    await client.query("COMMIT");

    console.log(`Rewritten: ${changed} documents`);
    for (const [c, n] of Object.entries(perCollection)) console.log(`  ${c.padEnd(18)} ${n}`);

    const { rows: left } = await client.query(
      `SELECT count(*)::int AS n FROM documents WHERE data::text LIKE '%zafiroindio.com/wp-content/uploads/%'`
    );
    console.log(`Still pointing at WordPress: ${left[0].n}${left[0].n ? "  (the ones that failed above)" : "  — none"}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
