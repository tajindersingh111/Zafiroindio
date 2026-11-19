import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { Invoice } from "@/lib/db/types";

/**
 * The tax invoice as a PDF, built in memory so it can be attached to an e-mail.
 *
 * Drawn with pdfkit rather than rendered from the HTML invoice: that would mean running a headless
 * browser on the server — a hundred megabytes of Chromium and a cold start measured in seconds — to
 * produce the same sheet of paper.
 *
 * The sheet is laid out as a shop's letterhead rather than a database dump: the wordmark and a gold
 * rule at the top, the two addresses facing each other, the items given room to breathe, and the
 * total set apart in its own block. A shopper should be able to glance at it and an accountant
 * should find the GST figure without hunting.
 */

const inr = (n: number) => "Rs. " + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const date = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/** pdfkit's built-in fonts are Latin-1 only, so anything outside it would draw as rubbish. */
const latin = (s: unknown) =>
  String(s ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[′″]/g, '"')
    .replace(/₹/g, "Rs.")
    .replace(/[^\x20-\x7E\n]/g, "");

const INK = "#0b1326";
const MUTED = "#6b7280";
const FAINT = "#9ca3af";
const GOLD = "#9a7b1c";
const GOLD_SOFT = "#f3e7c4";
const CREAM = "#fbf7ee";
const LINE = "#e8e2d8";

/** The wordmark, read once and kept — an invoice is often generated several times in a row. */
let logo: Buffer | null | undefined;
function logoBytes(): Buffer | null {
  if (logo !== undefined) return logo;
  try {
    logo = fs.readFileSync(path.join(process.cwd(), "public", "zafiro-logo-dark.png"));
  } catch {
    logo = null; // the sheet falls back to the shop's name set in type
  }
  return logo;
}

export function invoicePdf(invoice: Invoice): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 44, info: { Title: `Invoice ${invoice.invoiceNumber}`, Author: "Zafiro Indio" } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const b = invoice.businessSnapshot;
    const c = invoice.customerSnapshot;
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    // ── Letterhead ────────────────────────────────────────────────
    const mark = logoBytes();
    if (mark) {
      // 389 × 166 in the file; 118pt wide keeps it crisp and leaves the title room beside it.
      doc.image(mark, left, 42, { width: 118 });
    } else {
      doc.font("Helvetica-Bold").fontSize(20).fillColor(INK).text(latin(b.storeName), left, 46);
    }
    doc.font("Helvetica").fontSize(7.5).fillColor(GOLD).text("HANDBLOCK PRINTED IN JAIPUR", left, 104, { characterSpacing: 1.3 });

    doc.font("Helvetica-Bold").fontSize(17).fillColor(INK).text("TAX INVOICE", left, 46, { width, align: "right" });
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(GOLD).text(latin(invoice.invoiceNumber), left, 68, { width, align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(date(invoice.invoiceDate), left, 82, { width, align: "right" });

    doc.rect(left, 120, width, 2.5).fillColor(GOLD).fill();

    // ── Who, and who to ───────────────────────────────────────────
    const addr = (a: { address1?: string; address2?: string; city?: string; state?: string; postalCode?: string }) =>
      [a.address1, a.address2, [a.city, a.state].filter(Boolean).join(", "), a.postalCode].filter(Boolean).map(latin);

    const top = 140;
    const colW = width / 2 - 14;
    const midX = left + width / 2 + 14;

    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(FAINT).text("FROM", left, top, { characterSpacing: 1.2 });
    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(INK).text(latin(b.storeAddress?.company || b.storeName), left, top + 13, { width: colW });
    doc.font("Helvetica").fontSize(8.5).fillColor(MUTED);
    if (b.legalName) doc.text(`Prop. ${latin(b.legalName)}`, left, doc.y, { width: colW });
    for (const line of addr(b.storeAddress ?? {})) doc.text(line, left, doc.y, { width: colW });
    if (b.gstin) doc.font("Helvetica-Bold").fillColor(INK).text(`GSTIN  ${latin(b.gstin)}`, left, doc.y + 2, { width: colW });
    if (b.storeEmail) doc.font("Helvetica").fillColor(MUTED).text(latin(b.storeEmail), left, doc.y, { width: colW });
    const fromBottom = doc.y;

    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(FAINT).text("BILL TO", midX, top, { characterSpacing: 1.2 });
    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(INK).text(latin(c.customerName || "Customer"), midX, top + 13, { width: colW });
    doc.font("Helvetica").fontSize(8.5).fillColor(MUTED);
    for (const line of addr(c.billing ?? {})) doc.text(line, midX, doc.y, { width: colW });
    if (c.customerEmail) doc.text(latin(c.customerEmail), midX, doc.y, { width: colW });
    if (c.customerPhone) doc.text(latin(c.customerPhone), midX, doc.y, { width: colW });

    // ── The order, on its own band ────────────────────────────────
    let y = Math.max(fromBottom, doc.y) + 16;
    doc.rect(left, y, width, 26).fillColor(CREAM).fill();
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(INK).text(`ORDER ${latin(invoice.orderNumber)}`, left + 10, y + 9, { characterSpacing: 0.6 });
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(MUTED)
      .text(
        `${latin(String(invoice.paymentMethod).toUpperCase())}   ·   ${latin(String(invoice.paymentStatus).replace(/_/g, " ").toUpperCase())}`,
        left,
        y + 9,
        { width: width - 10, align: "right" }
      );
    y += 42;

    // ── Items ─────────────────────────────────────────────────────
    const col = { item: left + 10, qty: left + 302, rate: left + 352, total: right - 94 };

    const header = (atY: number) => {
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(FAINT);
      doc.text("ITEM", col.item, atY, { characterSpacing: 1 });
      doc.text("QTY", col.qty, atY, { width: 36, align: "right" });
      doc.text("RATE", col.rate, atY, { width: 74, align: "right" });
      doc.text("AMOUNT", col.total, atY, { width: 88, align: "right" });
      doc.moveTo(left, atY + 14).lineTo(right, atY + 14).strokeColor(INK).lineWidth(0.8).stroke();
      return atY + 24;
    };
    y = header(y);

    for (const item of invoice.itemsSnapshot ?? []) {
      const nameWidth = col.qty - col.item - 18;
      doc.font("Helvetica").fontSize(9.5).fillColor(INK);
      const nameHeight = doc.heightOfString(latin(item.name), { width: nameWidth });

      // Keep a row whole: if it will not fit, start it on the next page under a fresh header.
      if (y + nameHeight + 24 > doc.page.height - 150) {
        doc.addPage();
        y = header(doc.page.margins.top + 8);
      }

      doc.text(latin(item.name), col.item, y, { width: nameWidth });
      const detail = [item.sku && `SKU ${latin(item.sku)}`, ...(item.attributes ?? []).map((a) => `${latin(a.name)}: ${latin(a.value)}`)]
        .filter(Boolean)
        .join("    ");
      if (detail) doc.font("Helvetica").fontSize(7.8).fillColor(FAINT).text(detail, col.item, doc.y + 2, { width: nameWidth });
      // Where the name and its detail line end. Measured here, before the right-hand columns move the
      // cursor back up, or the divider below gets drawn through the detail text.
      const leftBottom = doc.y;

      doc.font("Helvetica").fontSize(9.5).fillColor(MUTED);
      doc.text(String(item.quantity), col.qty, y, { width: 36, align: "right" });
      doc.text(inr(item.price), col.rate, y, { width: 74, align: "right" });
      doc.font("Helvetica-Bold").fillColor(INK).text(inr(item.total), col.total, y, { width: 88, align: "right" });

      y = Math.max(leftBottom, y + nameHeight) + 12;
      doc.moveTo(left, y - 6).lineTo(right, y - 6).strokeColor(LINE).lineWidth(0.5).stroke();
    }

    // ── Totals, set apart ─────────────────────────────────────────
    y += 6;
    const boxX = right - 250;
    const rows: [string, number][] = [
      ["Subtotal", invoice.subtotal],
      ...(invoice.discount ? ([["Discount", -invoice.discount]] as [string, number][]) : []),
      ...(invoice.couponDiscount ? ([["Coupon", -invoice.couponDiscount]] as [string, number][]) : []),
      ["Shipping", invoice.shipping],
      ["Tax (GST)", invoice.tax],
    ];

    for (const [k, v] of rows) {
      doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(k, boxX, y, { width: 150, align: "right" });
      doc.fillColor(INK).text(inr(v), col.total, y, { width: 88, align: "right" });
      y = doc.y + 5;
    }

    y += 2;
    doc.rect(boxX, y, right - boxX, 34).fillColor(INK).fill();
    doc.font("Helvetica-Bold").fontSize(10).fillColor(GOLD_SOFT).text("TOTAL", boxX + 14, y + 12, { characterSpacing: 1 });
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#ffffff").text(inr(invoice.grandTotal), boxX, y + 10, { width: right - boxX - 14, align: "right" });
    y += 44;

    const paid = invoice.amountDue <= 0;
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(paid ? "#15803d" : "#b45309");
    doc.text(paid ? "PAID IN FULL" : `AMOUNT DUE   ${inr(invoice.amountDue)}`, boxX, y, { width: right - boxX - 14, align: "right", characterSpacing: 0.8 });

    // ── Foot ──────────────────────────────────────────────────────
    const footY = doc.page.height - 86;
    doc.rect(left, footY, width, 2).fillColor(GOLD).fill();
    doc.font("Helvetica-Bold").fontSize(8).fillColor(INK).text(latin(b.storeName), left, footY + 12);
    doc.font("Helvetica").fontSize(7.5).fillColor(FAINT);
    doc.text("This is a computer-generated invoice and needs no signature.", left, doc.y + 1, { width });
    doc.text(`Questions about this order? Write to ${latin(b.storeEmail || "")} quoting ${latin(invoice.orderNumber)}.`, left, doc.y + 1, { width });

    doc.end();
  });
}

/** The file name a customer sees on the attachment. */
export const invoiceFileName = (invoice: Invoice) => `${String(invoice.invoiceNumber).replace(/[^\w-]+/g, "-")}.pdf`;
