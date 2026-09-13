# Zafiro — Production-ready Next.js UI starter

A responsive, premium bedsheet ecommerce frontend recreated from the supplied Zafiro visual reference.

## Included
- Next.js App Router + TypeScript
- Responsive desktop/tablet/mobile UI
- Homepage, shop, product detail, collections, about, wishlist, cart, checkout, order success and search
- Client-side cart + wishlist persistence via localStorage
- Product schema-ready data model
- Dynamic product metadata
- robots.txt + sitemap
- 404 state
- Loading/empty/error-friendly UI states
- Premium editorial ecommerce styling
- 12 sample products
- INR pricing and Indian ecommerce copy

## Run

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## Production setup

1. Replace `https://zafiro.example` in `app/layout.tsx`, `app/robots.ts`, and `app/sitemap.ts` with the real domain.
2. Replace Unsplash image URLs in `lib/data.ts` with licensed Zafiro product/lifestyle assets stored in your CDN/object storage.
3. Connect products, inventory, auth, orders and payments to your backend.
4. Connect a real payment provider (for example Razorpay/Stripe) server-side; never trust client-side totals.
5. Add server-side validation, rate limiting, webhook verification, transactional email, analytics/consent and real shipping/tax rules before accepting live orders.
6. Add product JSON-LD and Organization/BreadcrumbList JSON-LD if desired.
7. Run `npm run build` before deployment.

## Visual note

The UI intentionally follows the supplied reference: warm ivory surfaces, editorial serif headings, restrained gold CTAs, large bedroom photography, thin borders, premium product cards and a conversion-focused ecommerce hierarchy.

The remote images are demo assets only and should be replaced with the brand's own licensed imagery before launch.
