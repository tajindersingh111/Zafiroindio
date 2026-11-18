/**
 * Pulls orders and customers from the old WooCommerce shop into this site's document store.
 *
 *   node scripts/import-woocommerce.mjs            # dry run: fetches, maps, reports, writes nothing
 *   node scripts/import-woocommerce.mjs --write    # actually writes
 *   node scripts/import-woocommerce.mjs --write --only=orders
 *
 * Credentials come from the environment and are never written to disk or printed:
 *
 *   WOO_URL=https://zafiroindio.com
 *   WOO_KEY=ck_...        (WooCommerce → Settings → Advanced → REST API, permission "Read")
 *   WOO_SECRET=cs_...
 *   DATABASE_URL=postgres://...   (whichever database you mean to fill)
 *
 * Re-running is safe: every row is keyed by its WooCommerce id, so a second run updates the same
 * rows instead of duplicating them. Nothing already in the shop is deleted.
 */

import { Client } from "pg";

const WRITE = process.argv.includes("--write");
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").split("=")[1] || "both";

const { WOO_URL, WOO_KEY, WOO_SECRET, DATABASE_URL } = process.env;
for (const [name, value] of Object.entries({ WOO_URL, WOO_KEY, WOO_SECRET, DATABASE_URL })) {
  if (!value) {
    console.error(`Missing ${name}. See the comment at the top of this file.`);
    process.exit(1);
  }
}

const auth = "Basic " + Buffer.from(`${WOO_KEY}:${WOO_SECRET}`).toString("base64");
const base = WOO_URL.replace(/\/+$/, "");

/** One page of a WooCommerce collection. Woo reports the page count in a header. */
async function page(resource, pageNo) {
  const url = `${base}/wp-json/wc/v3/${resource}?per_page=100&page=${pageNo}&orderby=id&order=asc${
    resource === "orders" ? "&status=any" : ""
  }`;
  const res = await fetch(url, { headers: { Authorization: auth, Accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${resource} page ${pageNo}: HTTP ${res.status} ${body.slice(0, 300)}`);
  }
  return { rows: await res.json(), pages: Number(res.headers.get("x-wp-totalpages") || 1) };
}

/** Every page of a collection, one request at a time so the old host is not hammered. */
async function fetchAll(resource) {
  const out = [];
  let pageNo = 1;
  let pages = 1;
  do {
    const { rows, pages: total } = await page(resource, pageNo);
    pages = total;
    out.push(...rows);
    process.stdout.write(`\r  ${resource}: ${out.length} fetched (page ${pageNo}/${pages})   `);
    pageNo++;
  } while (pageNo <= pages);
  process.stdout.write("\n");
  return out;
}

// ── Mapping ──────────────────────────────────────────────────────────

/**
 * Woo's statuses in this shop's vocabulary. Most of these are not WooCommerce's own: the old site
 * ran a courier plugin that added its own lifecycle (in-transit, out-for-delivery, pending-pickup,
 * rto-delivered), and those cover all but a handful of the orders. Anything still unknown is held
 * as on_hold rather than guessed at, and the run prints what it did not recognise.
 */
const STATUS = {
  // WooCommerce's own
  pending: "pending_payment",
  processing: "processing",
  "on-hold": "on_hold",
  completed: "delivered",
  cancelled: "cancelled",
  canceled: "cancelled", // the courier plugin spells it with one l
  refunded: "refunded",
  failed: "failed",
  trash: "cancelled",
  "checkout-draft": "payment_pending",
  // Courier plugin
  "pending-pickup": "processing", // packed, waiting for the courier to collect
  "in-transit": "shipped",
  "out-for-delivery": "out_for_delivery",
  delivered: "delivered",
  "rto-delivered": "returned", // return to origin: it came back undelivered
};

/** Statuses that mean the parcel reached the customer, so a COD order was in fact collected. */
const DELIVERED = new Set(["delivered"]);

/** Woo gateway ids vary by plugin, so match on what the id contains. */
function payMethod(id = "", title = "") {
  const s = `${id} ${title}`.toLowerCase();
  if (s.includes("cod") || s.includes("cash on delivery")) return "cod";
  if (s.includes("upi")) return "upi";
  if (s.includes("razorpay")) return "razorpay";
  // The old shop's gateway: "prepaid" and "GoKwik Prepaid" both mean paid online, gateway unknown.
  if (s.includes("prepaid") || s.includes("gokwik")) return "gateway";
  if (s.includes("netbank")) return "netbanking";
  if (s.includes("wallet")) return "wallet";
  if (s.includes("card") || s.includes("stripe")) return "card";
  return "gateway";
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Woo sends UTC timestamps without a zone; say so explicitly or they shift by the local offset. */
const iso = (v) => (v ? new Date(`${v}Z`).toISOString() : new Date().toISOString());

function address(a = {}) {
  return {
    firstName: a.first_name || "",
    lastName: a.last_name || "",
    company: a.company || undefined,
    address1: a.address_1 || "",
    address2: a.address_2 || undefined,
    city: a.city || "",
    state: a.state || "",
    postalCode: a.postcode || "",
    country: a.country || "IN",
    phone: a.phone || undefined,
    email: a.email || undefined,
  };
}

function mapOrder(o) {
  const billing = address(o.billing);
  const shipping = o.shipping?.address_1 ? address(o.shipping) : billing;
  const name = `${billing.firstName} ${billing.lastName}`.trim();

  return {
    id: `wc-${o.id}`,
    // Prefixed so an imported number can never be mistaken for one this shop issued.
    orderNumber: `WC-${o.number || o.id}`,
    customerId: o.customer_id ? `wc-cust-${o.customer_id}` : undefined,
    customerName: name || "Customer",
    customerEmail: (o.billing?.email || "").toLowerCase(),
    customerPhone: o.billing?.phone || undefined,
    type: "retail",
    status: STATUS[o.status] || "on_hold",
    items: (o.line_items || []).map((l) => ({
      productId: l.product_id ? String(l.product_id) : "",
      variationId: l.variation_id ? String(l.variation_id) : undefined,
      name: l.name || "Item",
      sku: l.sku || "",
      quantity: num(l.quantity) || 1,
      // Woo's `price` is the unit price after its own discounts; `total` is the line.
      price: num(l.price),
      discount: 0,
      tax: num(l.total_tax),
      total: num(l.total) + num(l.total_tax),
      image: l.image?.src || undefined,
    })),
    billing,
    shipping,
    couponCode: (o.coupon_lines || [])[0]?.code || undefined,
    couponDiscount: num(o.discount_total),
    subtotal: (o.line_items || []).reduce((s, l) => s + num(l.subtotal), 0),
    shippingCost: num(o.shipping_total) + num(o.shipping_tax),
    tax: num(o.total_tax),
    discount: num(o.discount_total),
    total: num(o.total),
    paymentMethod: payMethod(o.payment_method, o.payment_method_title),
    /**
     * A delivered COD order was paid at the door, which Woo never records as date_paid, so going
     * by that alone would report years of cash sales as unpaid.
     */
    paymentStatus: o.status === "refunded" ? "refunded" : o.date_paid || DELIVERED.has(o.status) ? "paid" : "pending",
    transactionId: o.transaction_id || undefined,
    notes: [],
    deliveredDate: DELIVERED.has(o.status) || o.status === "completed" ? iso(o.date_completed_gmt || o.date_modified_gmt) : undefined,
    createdAt: iso(o.date_created_gmt),
    updatedAt: iso(o.date_modified_gmt),
    /** Kept so an imported row is always identifiable, and re-importable. */
    importedFrom: { source: "woocommerce", id: o.id, number: o.number, status: o.status, at: new Date().toISOString() },
  };
}

function mapCustomer(c) {
  const billing = address(c.billing);
  return {
    id: `wc-cust-${c.id}`,
    type: "retail",
    status: "active",
    firstName: c.first_name || billing.firstName || "Customer",
    lastName: c.last_name || billing.lastName || "",
    email: (c.email || "").toLowerCase(),
    /**
     * Deliberately false. This flag means "proved they control this inbox by entering a code we
     * sent there", and nobody has done that on this site yet. Sign-in only ever matches verified
     * records, so an imported row cannot be claimed by someone typing a stranger's address — the
     * shopper signs in, gets their own record, and staff can merge the two if they want to.
     */
    emailVerified: false,
    phone: c.billing?.phone || undefined,
    company: billing.company,
    billing,
    shipping: c.shipping?.address_1 ? address(c.shipping) : billing,
    totalOrders: 0,
    totalSpent: 0,
    registeredAt: iso(c.date_created_gmt),
    updatedAt: new Date().toISOString(),
    importedFrom: { source: "woocommerce", id: c.id, at: new Date().toISOString() },
  };
}

// ── Writing ──────────────────────────────────────────────────────────

/**
 * Postgres jsonb rejects a null byte, and the old shop's data carries it — a few rows came through its
 * checkout with stray null bytes in them. They mean nothing here, so they are dropped.
 */
const clean = (doc) => JSON.stringify(doc).replace(/\\u0000/g, "");

async function upsertAll(client, collection, docs) {
  for (const doc of docs) {
    await client.query(
      `INSERT INTO documents (collection, id, position, data, "createdAt", "updatedAt")
       VALUES ($1, $2, 0, $3::jsonb, now(), now())
       ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, "updatedAt" = now()`,
      [collection, doc.id, clean(doc)]
    );
  }
}

const money = (n) => "INR " + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

async function main() {
  console.log(`Source: ${base}`);
  console.log(WRITE ? "Mode:   WRITE\n" : "Mode:   dry run (pass --write to save)\n");

  const wantOrders = ONLY === "both" || ONLY === "orders";
  const wantCustomers = ONLY === "both" || ONLY === "customers";

  const rawCustomers = wantCustomers ? await fetchAll("customers") : [];
  const rawOrders = wantOrders ? await fetchAll("orders") : [];

  const customers = rawCustomers.map(mapCustomer).filter((c) => c.email);
  const orders = rawOrders.map(mapOrder);

  // Totals per customer come from the orders we actually imported, not from Woo's own counters,
  // so the numbers shown in admin always match the orders behind them.
  const byId = new Map(customers.map((c) => [c.id, c]));
  for (const o of orders) {
    const c = o.customerId && byId.get(o.customerId);
    if (!c) continue;
    c.totalOrders += 1;
    c.totalSpent += o.total;
    if (!c.lastOrderDate || o.createdAt > c.lastOrderDate) {
      c.lastOrderDate = o.createdAt;
      c.lastOrderId = o.id;
    }
  }

  const revenue = orders.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0);
  const guests = orders.filter((o) => !o.customerId).length;
  const noEmail = orders.filter((o) => !o.customerEmail).length;
  const byStatus = orders.reduce((m, o) => ({ ...m, [o.status]: (m[o.status] || 0) + 1 }), {});
  const dates = orders.map((o) => o.createdAt).sort();

  console.log("\n── What came back ───────────────────────────");
  console.log(`customers      ${customers.length}`);
  console.log(`orders         ${orders.length}${dates.length ? `  (${dates[0].slice(0, 10)} → ${dates[dates.length - 1].slice(0, 10)})` : ""}`);
  console.log(`paid revenue   ${money(revenue)}`);
  console.log(`guest orders   ${guests}`);
  if (noEmail) console.log(`no e-mail      ${noEmail}  (these cannot be matched to a shopper later)`);
  console.log(`by status      ${Object.entries(byStatus).map(([k, v]) => `${k} ${v}`).join(", ") || "—"}`);

  const skipped = rawOrders.length - orders.length;
  if (skipped > 0) console.log(`skipped        ${skipped}`);
  const unknown = [...new Set(rawOrders.map((o) => o.status).filter((s) => !STATUS[s]))];
  if (unknown.length) console.log(`unknown status ${unknown.join(", ")}  → stored as on_hold`);

  if (!WRITE) {
    console.log("\nNothing was written. Re-run with --write once the numbers above look right.");
    console.log("Sample order:\n" + JSON.stringify(orders[0] ?? null, null, 2).slice(0, 1200));
    return;
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN");
    if (wantCustomers) await upsertAll(client, "customers", customers);
    if (wantOrders) await upsertAll(client, "orders", orders);
    await client.query("COMMIT");
    console.log(`\nWritten: ${customers.length} customers, ${orders.length} orders.`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  // The message can carry the URL but never the key: it is only ever sent as a header.
  console.error("\nImport failed:", err.message);
  process.exit(1);
});
