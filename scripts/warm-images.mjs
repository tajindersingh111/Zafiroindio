// Pre-generates the resized product photos after a deploy, so the first shoppers don't wait while
// the image optimiser downloads ~900 KB originals from the media server.
//
//   node scripts/warm-images.mjs https://zafiroindio.com
//
// Uses the public catalogue endpoint, a few requests at a time (gentle on the media server).
const base = (process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const WIDTHS = [384, 640, 828, 1080];
const CONCURRENCY = 4;

const { products = [] } = await (await fetch(`${base}/api/products`)).json();
const jobs = [];
for (const p of products) {
  (p.images || []).slice(0, 4).forEach((src, i) => {
    if (!/^https:\/\//.test(src)) return;
    for (const w of i < 2 ? WIDTHS : [1080]) jobs.push(`${base}/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`);
  });
}
let done = 0, failed = 0;
async function worker() {
  while (jobs.length) {
    const url = jobs.shift();
    const r = await fetch(url, { headers: { accept: "image/webp" } }).catch(() => null);
    if (!r?.ok) failed++;
    await r?.arrayBuffer().catch(() => {});
    if (++done % 25 === 0) console.log(`${done} images ready (${failed} failed)`);
  }
}
const total = jobs.length;
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`Done: ${total - failed}/${total} resized images cached.${failed ? " Re-run to retry the failures." : ""}`);
