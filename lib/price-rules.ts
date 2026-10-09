/**
 * One definition of "what does this cost" for the storefront, cart pricing, the Shiprocket catalogue
 * and stored orders.
 *
 * The WooCommerce import stored many products with `price` and `salePrice` swapped (sale price
 * higher than the regular price). A sale price above the regular price is never meant, so the
 * selling price is the lower of the two and the struck-through price is the highest known one.
 */
type Priced = { price?: number | null; salePrice?: number | null; mrp?: number | null };

const pos = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** What the customer pays. */
export function sellingPrice(p: Priced): number {
  const regular = pos(p.price);
  const sale = pos(p.salePrice);
  if (sale && regular) return Math.min(sale, regular);
  return sale || regular;
}

/** The "was" price shown struck through (never below the selling price). */
export function listPrice(p: Priced): number {
  return Math.max(pos(p.mrp), pos(p.price), pos(p.salePrice));
}
