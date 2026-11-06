# Production readiness audit — Zafiro Indio

Audited 2026-11-06 against commit `1147db4` on `main`. Updated 2026-11-07 after the Razorpay +
WhatsApp-OTP work: items marked **FIXED** were done in that change, the rest are still open.

**Verdict: the code is in good shape; the repository is not.** The application builds, typechecks
clean, guards its admin routes properly and creates orders atomically. What blocks a safe launch is
customer data sitting in git history and missing production secrets — not the code.

---

## Blockers (fix before launch)

### 1. Customer data is in git history on GitHub — HIGHEST PRIORITY

`data/` and `scratch/` were committed before `.gitignore` excluded them, and they are still in the
history of `https://github.com/tajindersingh111/Zafiroindio.git`:

| Path | Contents | First seen in |
|---|---|---|
| `data/*.json` | 469 customers, 356 orders, admin bcrypt password hashes, coupons, settings | `aaa0bbd`, `2f4c95b`, `0c51744` |
| `scratch/` | ~41 MB SQL dump of the live database | `43a6ca3` (first commit), `0c51744` |

The files are untracked now (`git rm --cached`), so new commits don't ship them — but anyone who can
read the repository can still `git log` them out.

**Actions**

1. Confirm whether the GitHub repository is public. If it is, or ever was, treat all of it as leaked.
2. Purge the paths from history and force-push:
   ```bash
   git filter-repo --path data --path scratch --invert-paths
   ```
   Then tell anyone with a clone to re-clone (old clones still hold the data).
3. Change every admin password — the hashes are exposed, so they are brute-forceable offline.
4. Rotate every credential listed in `SECURITY_TODO.md` (database password, Shiprocket Checkout key
   and secret, Fast2SMS, Razorpay, ShipMozo). `SECURITY_TODO.md` says this was never done.

### 2. `SESSION_SECRET` is not set

`.env` contains only `DATABASE_URL`. `lib/auth/token.ts:getSessionSecret()` deliberately **throws** in
production rather than fall back to a known default, so admin login will fail outright on deploy.

```bash
openssl rand -base64 48   # set as SESSION_SECRET in the hosting dashboard
```

Also unset and needed: `CRON_SECRET` (otherwise `/api/orders/cleanup-stale` and
`/api/shipments/sync` are unprotected), `NEXT_PUBLIC_SITE_URL`, and the SMTP block (no order emails
without it).

### 3. No error boundary — **FIXED**

`app/error.tsx` and `app/global-error.tsx` now exist: a branded page with *Try again* (Next 16 passes
`retry`, not the older `reset`) and the error digest to quote in support. `global-error.tsx` styles
everything inline, since it replaces the whole document and global CSS is gone at that point.

### 4. A product export CSV is tracked in the repo

`wc-product-export-1-10-2026-1790842765327.csv` (232 KB) is committed. Product data, not customer
data, so lower risk — but it belongs outside the repository.

---

## Should fix

### 5. `/api/shipping/calculate` is a cheap denial-of-service — **FIXED**

It was public, unauthenticated, **not rate limited**, and called `readCollection("products")` —
loading the *entire* catalogue from Postgres on every request. It now validates its body with Zod,
is rate limited (60/min), and loads only the products in the posted cart via the same
`id = ANY(...)` query `lib/pricing.ts` uses.

### 6. Rate limits missing on a few public routes

`/api/products`, `/api/banners`, `/api/store-contact` have no limiter. All three are cached with
`Cache-Control`, so the risk is low, but `/api/products` builds and gzips the whole catalogue on a
cache miss.

### 7. Content-Security-Policy is effectively open

`next.config.ts` sets `script-src 'self' 'unsafe-inline' 'unsafe-eval' https:` — any HTTPS origin can
run script on the site. The comment explains why: Shiprocket's checkout SDK pulls in whichever
payment provider the shopper picks, and that list changes without notice.

This is the single biggest security cost of hosting checkout at Shiprocket. Moving payments in-house
(Razorpay) lets the CSP be narrowed to Razorpay's own hosts.

### 8. Free-shipping threshold is inconsistent — **FIXED**

The cart hardcoded `FREE_SHIPPING_FROM = 999` while the calculator defaulted to ₹2000 and the real
charge came from Shiprocket's dashboard — so a shopper could be charged shipping on an order the cart
called free. The cart now reads `/api/checkout/quote`, the same server calculation the checkout uses,
and shows the real threshold, shipping line and total. One source of truth.

`lib/shipping/calculator.ts` also read `salePrice ?? price` directly, which disagreed with
`lib/price-rules.ts` (the module that exists to be the single definition) on the imported products
whose sale price is *above* the regular price. It now calls `sellingPrice()`.

### 9. Lint warnings

`npm run lint`: **0 errors, 64 warnings**. Almost all are `@next/next/no-img-element`, which is
deliberate here (`lib/img.ts` is a custom image pipeline). Worth clearing: an unused
`eslint-disable` in `components/site/ProductViewTracker.tsx:66`, an unused `isSuperAdmin` in
`components/admin/DeleteConfirmModal.tsx:22`, and `prefer-const` in `lib/orders/service.ts:422`.

---

## What is already solid

Worth saying plainly, because it is better than most stores at this stage:

- `npx tsc --noEmit` — clean. `npm run build` — succeeds, 190+ routes, ISR configured.
- Admin authorization is layered properly: `proxy.ts` is an optimistic gate and every route handler
  re-checks against the database via `lib/auth/guard.ts` (revocation, deactivated users, live role).
  Comments say so explicitly, and the code matches.
- Session cookies are HMAC-signed with **no hard-coded fallback secret** and a timing-safe compare.
- CSRF defence in depth: same-origin check on every state-changing admin request, on top of
  `SameSite=Lax`.
- Rate limiting is Postgres-backed, so the limit is shared across instances (the comment notes the
  in-memory version was useless on serverless).
- Order creation is genuinely careful: one transaction covers the idempotency marker, stock
  decrement, customer upsert and the order row, so a retried webhook cannot double-book stock.
  Prices always come from the database, never the browser.
- Dangerous endpoints are guarded — `/api/refunds`, `/api/shipments/create`, `/api/shipments/rates`,
  `/api/orders` all call `requireAdmin` (a comment on `/api/refunds` notes it used to be public).
- Unknown courier statuses never overwrite an order with a guess, and orders never move backwards.

---

## Fixed in the Razorpay + WhatsApp-OTP change

- **Customer accounts now exist.** WhatsApp OTP login, a 60-day signed session, order history,
  prefilled checkout address, invoice access. See the README.
- **The admin's commerce features are reachable again.** Coupons (`lib/checkout/coupon.ts` — nothing
  had ever *applied* a coupon before) and the shipping / COD-fee calculator now decide real totals,
  because the cart-to-payment step is ours.
- **`/account/orders` was broken and privacy-leaky.** Both account order pages fetched
  `/api/admin/orders`, which is staff-only: shoppers got a 401 and a silently empty page
  (`.catch(() => {})`), and an admin browsing those pages would have been shown *every* customer's
  orders. They now use `/api/account/orders`, scoped to the signed-in customer by id or verified
  phone, with cost prices and staff-only notes stripped. Verified: 62 of 417 orders returned, one
  distinct phone, no `costPrice` in the payload.
- **`runPostOrderTasks` could fail a paid order.** `after()` throws outside a request scope, and the
  call sat *after* the order was committed — so the failure would have returned a 500 for an order
  that already existed, inviting a retry. Post-order work is now genuinely best-effort.

## Still open — product decisions, not bugs

- **No server-side wishlist.** Still `localStorage` only, so it does not follow a signed-in shopper
  between devices. The Prisma `Wishlist` models exist but are unused.
- **Abandoned-cart tracking** is still not wired to the new checkout, though the payment sessions it
  would need are now being recorded (`payment-sessions`).
- **The relational Prisma models are still dead.** `Customer`, `Order`, `OtpRequest` and friends are
  defined but unused; everything runs on the `Document` JSON store. Worth either adopting or deleting
  so the schema stops describing a database that isn't there.

---

## What was verified (2026-11-07)

Run against the **local** dev database (`.pgdata` cluster on port 5435), never the live Railway
database. `npx tsc --noEmit` clean, `npm run lint` 0 errors, `npm run build` succeeds.

**Auth boundary**

| Check | Result |
|---|---|
| `/api/account/orders` with no cookie | 401 |
| `/api/account/me` with no cookie | 401 |
| `/account/orders` signed out | 307 → `/login?next=/account/orders` |
| Forged (unsigned) customer cookie | 401 |
| Cross-site POST to `/api/auth/otp/send` | 403 |
| Order history scoping | 62 of 417 orders, one distinct phone, no `costPrice` leaked |

**OTP login** — full flow in the browser: code issued, delivered via the dev log fallback, 60 s
resend cooldown shown, a wrong code reported "4 attempts left", the correct code signed in and
matched the existing customer record.

**Pricing** — 8 quote cases: free-shipping threshold, COD fee, `WELCOME10` (case-insensitive),
below-minimum-spend refusal, inactive coupon, unknown coupon, out-of-stock, unknown product. All
correct, including charging ₹2,999 not ₹4,999 on the products whose sale price is above the regular
one.

**Razorpay signatures** — 15 unit checks: valid handshake accepted; tampered signature, swapped order
id, swapped payment id, empty signature and reversed concatenation all rejected; valid webhook
accepted; tampered webhook body, wrong secret, null signature and a re-serialised body all rejected;
paise conversion exact (including `0.1 + 0.2`).

**Confirmation path** — 14 checks against a stubbed gateway: an underpaid payment is refused and
touches neither orders nor stock; a payment belonging to another Razorpay order is refused; a failed
payment marks the session failed; a good payment creates one order, deducts stock once, and a
replayed confirmation returns the same order without double-deducting.

**Webhook, live over HTTP** — unsigned → 401, wrong signature → 401, body tampered from ₹1,098 to ₹1
with the original signature → 401, valid → order `ZI-19343` created, replay → `duplicate`. Stock
moved 5 → 4 exactly once.

**Orders placed end to end** — COD order `ZI-19339`: stock 10 → 8, `shippingCost` 159 (₹99 + ₹60 COD),
total ₹2,157, `costPrice` snapshotted for profitability, invoice generated, audit log written,
`/order-success?ref=…` renders, invoice downloadable with the ref and 404 without it. Coupon order
`ZI-19344`: `WELCOME10` usage count 12 → 13, discount stored on the order.

**Graceful degradation** — with no Razorpay keys, `/api/checkout/create` returns 503 with "choose Cash
on Delivery" and the webhook returns 503. COD is unaffected.

### Not verified

- **A real Razorpay payment.** No test keys were available, so the gateway was stubbed and the
  signature logic tested directly. Do one `rzp_test_*` payment end to end before going live.
- **Real WhatsApp OTP delivery.** No Meta account configured here; the authentication-template payload
  follows Meta's documented shape but has not been sent through Meta. Send one test OTP after adding
  the template.
- **`/api/refunds/execute`** — the logic and its double-click guard were reviewed, not executed
  against Razorpay.
