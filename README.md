# Zafiro Indio

Hand-block printed bedding store (Jaipur). Next.js 16 App Router + TypeScript, PostgreSQL via Prisma 7,
checkout (phone OTP, address, payment / COD) by **Shiprocket Checkout (Fastrr)**, shipping by **ShipMozo**.

## Run locally

```bash
npm install
npm run dev            # http://localhost:3000
```

`.env` → `DATABASE_URL` decides which database you use. **Don't point local development at the live
database** (test orders and stock changes would be real). A private dev database:

```bash
# one-time: create a cluster in ./.pgdata (git-ignored) and load data/*.json into it
"/c/Program Files/PostgreSQL/18/bin/initdb.exe" -D .pgdata -U postgres -A trust
"/c/Program Files/PostgreSQL/18/bin/pg_ctl.exe" -D .pgdata -l .pgdata/server.log -o "-p 5435 -c listen_addresses=localhost" start
"/c/Program Files/PostgreSQL/18/bin/psql.exe" -h localhost -p 5435 -U postgres -c "CREATE DATABASE zafiro_dev"
DATABASE_URL=postgresql://postgres@localhost:5435/zafiro_dev npx prisma db push
DATABASE_URL=postgresql://postgres@localhost:5435/zafiro_dev npx tsx scripts/migrate-json-to-documents.ts

# every time
DATABASE_URL=postgresql://postgres@localhost:5435/zafiro_dev npm run dev
```

`npm run build` prerenders the cached pages, so it needs a reachable database (if it can't reach one,
those pages fall back to rendering on request instead of failing the build).

## How checkout works

1. Cart page or **Buy it now** → `POST /api/checkout/shiprocket/token`. Prices come from the database,
   never the browser; the server signs the cart (`X-Api-HMAC-SHA256`) and gets a Shiprocket token.
2. The Shiprocket SDK (`checkout-ui.shiprocket.com/assets/js/channels/shopify.js`, preloaded while the
   shopper browses) opens Shiprocket's drawer: phone OTP, address, coupon, payment / COD.
3. Shiprocket redirects to `/order-success?ref=…&oid=…&ost=…`. The order is confirmed from **either**
   - the confirmation page, which looks the order up with Shiprocket's API (`custom-platform-order/details`), or
   - the order webhook. A signed webhook is used directly; an unsigned one is only a hint and the order is
     looked up at Shiprocket, so a forged call can't create an order.

   Whichever arrives first stores the order; a unique key per Shiprocket order prevents duplicates and
   double stock deduction.

### Shiprocket dashboard setup

| Setting | Value |
|---|---|
| API key / secret | `SHIPROCKET_CHECKOUT_API_KEY`, `SHIPROCKET_CHECKOUT_API_SECRET` (server env only) |
| Catalogue: products | `https://<domain>/api/shiprocket/catalog/products` |
| Catalogue: collections | `https://<domain>/api/shiprocket/catalog/collections` |
| Catalogue: products in a collection | `https://<domain>/api/shiprocket/catalog/collections/{id}/products` |
| Order webhook (recommended) | `https://<domain>/api/webhooks/shiprocket-checkout` |

Catalogue ids are numeric and permanent. After deploying, ask Shiprocket to re-sync the catalogue.
Coupons (e.g. `WELCOME10`) are created in the Shiprocket Checkout dashboard.

## How shipping works (ShipMozo)

API client: `lib/shipping/shipmozo.ts` (`https://shipping-api.com/app/api/v1`, `public-key` / `private-key`
headers); order lifecycle hooks: `lib/shipping/provider.ts`.

1. **Connect:** Admin → Shipping → paste the public + private key from ShipMozo panel → Settings → API, pick the
   pickup warehouse, Save. (Or set `SHIPMOZO_PUBLIC_KEY` / `SHIPMOZO_PRIVATE_KEY` on the server.)
2. **New order** (paid or COD, confirmed by Fastrr): sent to ShipMozo automatically (`push-order`), so it shows
   in the ShipMozo panel. Nothing is booked or charged yet. Orders ON HOLD are not sent.
3. **Dispatch:** Admin → Orders → open the order → *Courier rates* (ShipMozo quotes, cheapest first) → pick one
   → *Book & get AWB*. This books the courier (debits the ShipMozo wallet), stores the AWB + label and
   schedules the pickup. The quick *Dispatch* button in the order list uses your ShipMozo courier priority,
   else the cheapest courier. Couriers booked directly in the ShipMozo panel are picked up by the sync.
4. **Tracking:** courier scans move the order to shipped → out for delivery → delivered (COD becomes paid) and
   e-mail the customer; RTO marks it returned, restocks and queues a refund. A failed delivery attempt (NDR)
   does not. Status comes from:
   - a cron every 30–60 min: `POST https://<domain>/api/shipments/sync` with `Authorization: Bearer <CRON_SECRET>`,
   - the customer tracking page `/track` (refreshes live if the last check is older than 15 min),
   - the admin *Refresh tracking* button,
   - optionally a ShipMozo webhook to `https://<domain>/api/webhooks/shipping?token=<SHIPMOZO_WEBHOOK_SECRET>`
     (used only as a hint; the status is always re-read from ShipMozo).
5. **Cancel:** cancelling an order in the shop also cancels it on ShipMozo (the result is added to the order notes).
6. The product page PIN check asks ShipMozo whether a courier serves that PIN and whether COD is available.

Shipping charges shown at checkout are configured in the Shiprocket Checkout dashboard, not here.

## Banners & announcement bar

Admin → Marketing Center → Banners. Slider banners show on the homepage in list order (▲▼ to reorder),
cross-fading every 6.5 s; announcement texts rotate in the bar at the top of every page. Each item has
optional show-from / show-until dates (status: Live / Scheduled / Expired / Disabled).

- Banner images: 1920 × 800 px landscape with the product on the **right** half (the left is covered by the
  heading). Uploads are converted to WebP. Ready-made images: `public/images/banners/` (festive, monsoon,
  quilted, dining).
- Button links: `/shop`, `/collections/<slug>`, `/products/<slug>`. A link to a collection or product that
  doesn't exist sends visitors to `/shop` instead of a 404.

## Performance and scale

- Storefront pages (home, products, collections) are cached (ISR, 60 s) and rebuilt in the background;
  an admin edit refreshes them immediately. Catalogue reads go through an in-process cache
  (`lib/cache.ts`): one database query per minute per server, not one per visitor, and the last good
  catalogue keeps being served if the database hiccups.
- Product photos are served resized as WebP through Next's image optimiser (a 2560 px, ~860 KB
  original becomes ~47 KB at card size). After each deploy run `node scripts/warm-images.mjs https://<domain>`
  so the resized copies exist before shoppers arrive.
- Checkout pricing reads only the products in the cart. Database connections are pooled
  (`DB_POOL_MAX`, default 15 per instance).
- For real traffic spikes put a CDN (e.g. Cloudflare) in front: cached pages and `/_next/image` responses
  carry cache headers and are then served from the edge. Run 2+ instances behind the load balancer and
  keep `instances × DB_POOL_MAX` below Postgres `max_connections`.

## Before launch

- Product images are hot-linked from the old WordPress site (`zafiroindio.com/wp-content/uploads/…`).
  If the domain moves to this app, those URLs disappear: move the images to object storage/CDN first.
- Content to check in the admin panel (Banners). The original data had: announcement "Free Shippin Orders
  Above ₹99" (typo, and a threshold that doesn't match the ₹999 in the site description), banner buttons
  `/collection/mughal-gardens` and `/collection/indigo` (collections that don't exist, so they now fall back
  to /shop), and a banner that expired on 30 Sep 2026. If the live site still has these, edit them there. Also: the demo collections (Floral/Minimal/…; they have no products, so the storefront
  shows the real categories instead), and the footer phone number / social links (`components/Footer.tsx`).
- Coupons shoppers use (e.g. `WELCOME10` from the welcome pop-up) must exist in the Shiprocket Checkout
  dashboard; Admin → Coupons is for records only.
- Admin → Meta Ads is a demo (sample data, no Facebook connection).
- One Marilyn Mist gallery photo (`…Pillow-Set-scaled.webp`) is missing on zafiroindio.com; the product page
  hides it, but remove it from the product in the admin.
- Check product prices in the admin: the WooCommerce import swapped regular and sale price on many
  products; the site now always charges the lower of the two.
- Rotate credentials and clean git history as described in `SECURITY_TODO.md`.
