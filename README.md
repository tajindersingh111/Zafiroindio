# Zafiro Indio

Hand-block printed bedding store (Jaipur). Next.js 16 App Router + TypeScript, PostgreSQL via Prisma 7,
own checkout with **Razorpay** (UPI / cards / net banking) and COD, shopper login by **WhatsApp OTP**,
shipping by **ShipMozo**.

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

## How customers sign in (WhatsApp OTP)

There is no password. A shopper enters their mobile number, we send a 6-digit code to WhatsApp, and a
correct code signs them in and creates their customer record on first login.

1. `/login` → `POST /api/auth/otp/send`. `lib/auth/otp.ts` issues the code; only an HMAC of it is
   stored, so a leaked database row cannot be used to sign in.
2. `POST /api/auth/otp/verify` checks the code and sets `zafiro-customer-session`, an HMAC-signed,
   httpOnly cookie valid for 60 days. It is signed in a different HMAC domain from the admin cookie,
   so a shopper session can never be replayed as a staff one.
3. Every protected route re-reads the customer from the database (`lib/auth/customer.ts`), so a
   blocked or deleted customer is signed out even while holding a validly signed cookie. `proxy.ts`
   is only an optimistic first gate for `/account/*`.

Signed-in shoppers get their full order history at `/account/orders`, a prefilled checkout address
and invoice downloads. `/account` itself stays public: the order-number + contact lookup still works
without signing in, and so does `/track`.

### Because every OTP costs money

Meta bills per authentication message, so the limits are about the bill as much as security:

| Limit | Value | Where |
|---|---|---|
| Resend cooldown | 60 s | `lib/auth/otp.ts` |
| Codes per phone | 3 / hour | `lib/auth/otp.ts` |
| Wrong codes before the code is burned | 5 | `lib/auth/otp.ts` |
| Code lifetime | 5 min | `lib/auth/otp.ts` |
| Sends per IP | 20 / hour | `/api/auth/otp/send` |
| Sends per phone (second gate) | 5 / hour | `/api/auth/otp/send` |

### WhatsApp setup (Meta Cloud API)

Admin → Settings → WhatsApp. Needs the token and phone-number id, plus **Login OTP Template Name**:
an approved template in the **Authentication** category with a *Copy code* button. Meta will not
deliver a plain-text code to someone who has not messaged you in the last 24 hours, so without that
template OTP login is off (the send endpoint says so rather than failing silently).

Sending uses the shape Meta documents for authentication templates: the code appears **twice**, once
as the body parameter and once as the button parameter at `sub_type: "url"`, `index: "0"`.

In development, with no WhatsApp configured, the code is printed to the server log and the response
says so. That never happens in production — codes would end up in hosting logs.

> Do **not** point `whatsappProvider` at Green API for OTP. It is an unofficial WhatsApp Web bridge:
> if the number is banned, every customer is locked out of the site at once.

## How checkout works (Razorpay / COD)

Checkout is ours: `/checkout` collects the address, coupon and payment method, and the server prices
everything. The browser never sends a price — only product ids, quantities, chosen options, a coupon
code and the payment method.

1. `/cart` or **Buy it now** → `/checkout`. "Buy it now" stashes that one line in `sessionStorage`
   (`lib/checkout/buy-now.ts`) and leaves the cart untouched.
2. `POST /api/checkout/quote` prices the cart (`lib/checkout/quote.ts`): line prices from
   `lib/price-rules.ts`, coupon from Admin → Coupons, shipping and COD fee from
   `lib/shipping/calculator.ts`. This is the only place a total is decided, so what the shopper agrees
   to and what Razorpay is asked for cannot drift apart.
3. `POST /api/checkout/create`:
   - **COD** places the order immediately.
   - **Online** creates no order. It freezes the priced cart in a payment session
     (`lib/checkout/session.ts`) and returns a Razorpay order for the browser to pay. An abandoned
     payment therefore leaves no phantom order and holds no stock. Freezing the totals also means a
     catalogue price change mid-payment cannot make the stored order disagree with what was charged.
4. Razorpay Checkout opens (`lib/checkout/razorpay-launch.ts`). The order is confirmed from **either**
   - `POST /api/checkout/verify` — the browser handshake. The HMAC signature must verify **and** the
     payment is then re-read from Razorpay's API, because a signature only proves the values came
     from Razorpay, not that money arrived.
   - `POST /api/webhooks/razorpay` — independent of the shopper's browser, so closing the tab still
     produces an order. Unsigned or wrongly signed calls are rejected outright (Razorpay always
     signs, so there is no reason to be lenient).

   Whichever arrives first stores the order; the Razorpay order id is a unique key, so duplicates and
   double stock deduction are impossible. A payment for less than the agreed total, or one belonging
   to a different checkout, is refused. `/order-success?ref=…` also asks Razorpay directly if neither
   path has confirmed yet, so a paid order still appears when the webhook is late or unconfigured.

### Razorpay dashboard setup

| Setting | Value |
|---|---|
| API keys | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (server env) |
| Webhook URL | `https://<domain>/api/webhooks/razorpay` |
| Webhook events | `payment.captured`, `payment.failed` |
| Webhook secret | `RAZORPAY_WEBHOOK_SECRET` |

Coupons now live in **Admin → Coupons** (`lib/checkout/coupon.ts` applies them), and shipping / COD
fees in **Admin → Settings** — not in a third-party dashboard. Refunds for Razorpay orders can be sent
from the admin through `POST /api/refunds/execute` (Super Admin only); COD and legacy Fastrr orders
still use the record-then-confirm flow on `/api/refunds`.

## Shiprocket Checkout (Fastrr) — legacy

Fastrr is no longer the cart's checkout, but the code, the order webhook and the catalogue endpoints
are kept so existing Fastrr orders keep working and the catalogue stays in sync if you still use it.
`/order-success` handles refs from both flows.

| Setting | Value |
|---|---|
| API key / secret | `SHIPROCKET_CHECKOUT_API_KEY`, `SHIPROCKET_CHECKOUT_API_SECRET` (server env only) |
| Catalogue: products | `https://<domain>/api/shiprocket/catalog/products` |
| Catalogue: collections | `https://<domain>/api/shiprocket/catalog/collections` |
| Catalogue: products in a collection | `https://<domain>/api/shiprocket/catalog/collections/{id}/products` |
| Order webhook | `https://<domain>/api/webhooks/shiprocket-checkout` |

Catalogue ids are numeric and permanent. After deploying, ask Shiprocket to re-sync the catalogue.

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
- Coupons shoppers use (e.g. `WELCOME10` from the welcome pop-up) must exist in **Admin → Coupons** —
  they are applied by our own checkout now, not in a third-party dashboard.
- Admin → Meta Ads is a demo (sample data, no Facebook connection).
- One Marilyn Mist gallery photo (`…Pillow-Set-scaled.webp`) is missing on zafiroindio.com; the product page
  hides it, but remove it from the product in the admin.
- Check product prices in the admin: the WooCommerce import swapped regular and sale price on many
  products; the site now always charges the lower of the two.
- Rotate credentials and clean git history as described in `SECURITY_TODO.md`. **Customer data is still
  in the repository history** — see `PRODUCTION_READINESS.md`, which is the launch blocker list.
- Set `SESSION_SECRET` (32+ chars) and `CRON_SECRET` in the hosting dashboard. Admin login throws
  without `SESSION_SECRET`, by design; shopper sessions and OTP hashes use it too.
- Set the Razorpay keys and register the webhook (see *Razorpay dashboard setup*). Until
  `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are set, `/checkout` correctly reports online payment as
  unavailable and COD still works — so test COD first, then switch on online payment.
- Add the WhatsApp **Authentication** template and paste its name into Admin → Settings, or shoppers
  cannot sign in. Check Meta's current per-message authentication rate before launch; it is billed per
  OTP.
- Free-shipping threshold and COD fee come from Admin → Settings (defaults: free over ₹2,000, ₹99
  shipping, ₹60 COD fee). The cart and checkout both read the same server calculation, so set them
  once there — the old hardcoded ₹999 in the cart is gone.
