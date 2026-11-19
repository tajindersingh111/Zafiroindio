/**
 * GST on a tax-inclusive price.
 *
 * Every price in this shop already contains its GST, so nothing is ever added at checkout. What an
 * invoice has to show is how much of the amount charged was tax: the part that is taxable value, the
 * part that is GST, and — because the supplier is registered in Rajasthan — whether that GST is split
 * into CGST and SGST (the buyer is in Rajasthan too) or charged whole as IGST (the buyer is anywhere
 * else).
 *
 * Pure functions, no I/O, so the same arithmetic serves the invoice, the checkout summary and any
 * report that wants it.
 */

import type { TaxClass } from "@/lib/db/types";

/**
 * Rate used for a product that has no tax class set. 5% is what the old WooCommerce shop charged on
 * every order (1,219 tax lines, all 5%), so an unclassified product keeps the rate it has always had.
 * Override it in Admin -> Settings with `defaultGstRate`.
 */
export const DEFAULT_GST_RATE = 5;

const CLASS_RATE: Record<TaxClass, number> = { standard: 18, reduced: 5, zero: 0, none: 0 };

/** The GST rate (%) for a product's tax class, or `fallback` when it has none. */
export function gstRateFor(taxClass: unknown, fallback: number = DEFAULT_GST_RATE): number {
  return typeof taxClass === "string" && taxClass in CLASS_RATE ? CLASS_RATE[taxClass as TaxClass] : fallback;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** "Jammu & Kashmir" and "Jammu and Kashmir" are the same state; so are stray spaces and case. */
const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");

/** GST state codes (the first two digits of a GSTIN). */
const STATES: [string, string][] = [
  ["01", "Jammu and Kashmir"], ["02", "Himachal Pradesh"], ["03", "Punjab"], ["04", "Chandigarh"],
  ["05", "Uttarakhand"], ["06", "Haryana"], ["07", "Delhi"], ["08", "Rajasthan"],
  ["09", "Uttar Pradesh"], ["10", "Bihar"], ["11", "Sikkim"], ["12", "Arunachal Pradesh"],
  ["13", "Nagaland"], ["14", "Manipur"], ["15", "Mizoram"], ["16", "Tripura"],
  ["17", "Meghalaya"], ["18", "Assam"], ["19", "West Bengal"], ["20", "Jharkhand"],
  ["21", "Odisha"], ["22", "Chhattisgarh"], ["23", "Madhya Pradesh"], ["24", "Gujarat"],
  ["26", "Dadra and Nagar Haveli and Daman and Diu"], ["27", "Maharashtra"], ["29", "Karnataka"],
  ["30", "Goa"], ["31", "Lakshadweep"], ["32", "Kerala"], ["33", "Tamil Nadu"], ["34", "Puducherry"],
  ["35", "Andaman and Nicobar Islands"], ["36", "Telangana"], ["37", "Andhra Pradesh"], ["38", "Ladakh"],
];

const CODE_BY_NAME = new Map<string, string>(STATES.map(([code, name]) => [norm(name), code]));
// Spellings that turn up in real addresses.
for (const [alias, code] of [["orissa", "21"], ["pondicherry", "34"], ["uttaranchal", "05"], ["rj", "08"], ["dadraandnagarhaveli", "26"], ["damananddiu", "26"]] as const) {
  CODE_BY_NAME.set(alias, code);
}
const NAME_BY_CODE = new Map<string, string>(STATES);

export const stateCodeOf = (state: unknown): string => CODE_BY_NAME.get(norm(state)) ?? "";
export const stateNameOf = (code: string): string => NAME_BY_CODE.get(code) ?? "";

export interface GstLineInput {
  /** What the customer paid for this line, GST included, before shipping and discounts are spread. */
  total: number;
  /** GST rate in percent. */
  rate: number;
}

export interface GstLine {
  rate: number;
  /** The line's share of the invoice total once shipping and discounts are spread over it. */
  gross: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
}

export interface GstBand {
  rate: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
}

export interface GstBreakup {
  /** "intra": CGST + SGST. "inter": IGST. */
  regime: "intra" | "inter";
  placeOfSupply: { state: string; code: string };
  lines: GstLine[];
  /** One row per rate, as a tax invoice prints it. */
  bands: GstBand[];
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  gross: number;
}

/**
 * Splits an invoice total into taxable value and GST.
 *
 * `invoiceTotal` is what the customer was charged in all. Shipping and any discount are not given
 * separately: whatever the lines do not account for is spread over them in proportion to their value,
 * which is how a freight charge or a discount follows the goods it relates to (so it carries the same
 * rate) and means the pieces always add back to the invoice total exactly.
 */
export function computeGst(input: {
  lines: GstLineInput[];
  invoiceTotal: number;
  sellerGstin: string;
  buyerState: string;
}): GstBreakup {
  const sellerCode = String(input.sellerGstin || "").slice(0, 2);
  const buyerCode = stateCodeOf(input.buyerState);
  const regime: "intra" | "inter" = buyerCode && buyerCode === sellerCode ? "intra" : "inter";

  const itemsSum = input.lines.reduce((s, l) => s + (Number(l.total) || 0), 0);
  const adjustment = (Number(input.invoiceTotal) || 0) - itemsSum;

  // Each line's gross: its own value plus its share of the adjustment, rounded to paise. The last
  // line absorbs the rounding so the lines sum to the invoice total to the paisa.
  let allocated = 0;
  const grosses = input.lines.map((l, i) => {
    const isLast = i === input.lines.length - 1;
    const share = itemsSum > 0 ? (Number(l.total) || 0) / itemsSum : 1 / (input.lines.length || 1);
    const gross = isLast ? round2(input.invoiceTotal - allocated) : round2((Number(l.total) || 0) + adjustment * share);
    allocated += gross;
    return gross;
  });

  const lines: GstLine[] = input.lines.map((l, i) => {
    const gross = grosses[i];
    const rate = Math.max(0, Number(l.rate) || 0);
    const tax = round2((gross * rate) / (100 + rate));
    const taxable = round2(gross - tax);
    if (regime === "intra") {
      const cgst = round2(tax / 2);
      return { rate, gross, taxable, cgst, sgst: round2(tax - cgst), igst: 0, tax };
    }
    return { rate, gross, taxable, cgst: 0, sgst: 0, igst: tax, tax };
  });

  const byRate = new Map<number, GstBand>();
  for (const l of lines) {
    const band = byRate.get(l.rate) ?? { rate: l.rate, taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0 };
    band.taxable = round2(band.taxable + l.taxable);
    band.cgst = round2(band.cgst + l.cgst);
    band.sgst = round2(band.sgst + l.sgst);
    band.igst = round2(band.igst + l.igst);
    band.tax = round2(band.tax + l.tax);
    byRate.set(l.rate, band);
  }
  const bands = [...byRate.values()].sort((a, b) => a.rate - b.rate);
  const sum = (pick: (b: GstBand) => number) => round2(bands.reduce((s, b) => s + pick(b), 0));

  return {
    regime,
    placeOfSupply: { state: buyerCode ? stateNameOf(buyerCode) : String(input.buyerState || ""), code: buyerCode },
    lines,
    bands,
    taxable: sum((b) => b.taxable),
    cgst: sum((b) => b.cgst),
    sgst: sum((b) => b.sgst),
    igst: sum((b) => b.igst),
    tax: sum((b) => b.tax),
    gross: round2(lines.reduce((s, l) => s + l.gross, 0)),
  };
}
