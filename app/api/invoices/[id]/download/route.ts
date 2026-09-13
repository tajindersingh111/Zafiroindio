import { NextResponse } from "next/server";
import { getInvoiceByOrderId, getAllInvoices } from "@/lib/db/invoices";
import { readCollection } from "@/lib/db/store";
import type { Order } from "@/lib/db/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  let invoice = getAllInvoices().find(i => i.id === id || i.invoiceNumber === id || i.orderId === id || i.orderNumber === id);

  if (!invoice) {
    const orders = readCollection<Order>("orders");
    const foundOrder = orders.find(o => o.id === id || o.orderNumber === id);
    if (foundOrder) {
      invoice = getInvoiceByOrderId(id, foundOrder) || undefined;
    }
  }

  if (!invoice) {
    return new NextResponse("Invoice Not Found", { status: 404 });
  }

  const b = invoice.businessSnapshot;
  const c = invoice.customerSnapshot;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber} — Zafiro Indio</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; margin: 0; padding: 40px; background: #fff; }
    .invoice-card { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 30px; }
    .brand { font-family: Georgia, serif; font-size: 28px; font-weight: bold; color: #8c5e0f; letter-spacing: 0.5px; }
    .inv-title { font-size: 20px; font-weight: bold; color: #0f172a; text-align: right; }
    .inv-meta { font-size: 13px; color: #64748b; margin-top: 4px; text-align: right; }
    .address-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 32px; font-size: 13px; line-height: 1.6; }
    .section-title { font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; color: #8c5e0f; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 32px; font-size: 13px; }
    th { background: #f8fafc; text-align: left; padding: 12px 14px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0; }
    td { padding: 14px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .total-table { width: 300px; margin-left: auto; border: none; }
    .total-table td { padding: 6px 12px; border: none; }
    .total-row { font-size: 16px; font-weight: bold; color: #0f172a; border-top: 2px solid #e2e8f0 !important; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; background: #ecfdf5; color: #166534; border: 1px solid #a7f3d0; }
    .print-btn { display: block; width: 180px; margin: 0 auto 30px; padding: 10px; background: #b88221; color: #fff; text-align: center; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; }
    @media print { .print-btn { display: none; } body { padding: 0; } .invoice-card { border: none; padding: 0; } }
  </style>
</head>
<body>
  <button onclick="window.print()" class="print-btn">🖨️ Print / Download PDF</button>

  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="brand">ZAFIRO</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${b.storeName} — Handcrafted Bedding</div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">GSTIN: ${b.gstin || "N/A"}</div>
      </div>
      <div>
        <div class="inv-title">TAX INVOICE</div>
        <div class="inv-meta">Invoice #: <strong>${invoice.invoiceNumber}</strong></div>
        <div class="inv-meta">Order #: <strong>${invoice.orderNumber}</strong></div>
        <div class="inv-meta">Date: ${new Date(invoice.invoiceDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
        <div class="inv-meta" style="margin-top: 6px;">Status: <span class="badge">${invoice.paymentStatus.toUpperCase()}</span></div>
      </div>
    </div>

    <div class="address-grid">
      <div>
        <div class="section-title">Billed & Shipped To</div>
        <strong>${c.customerName}</strong><br>
        ${c.shipping.address1}${c.shipping.address2 ? `, ${c.shipping.address2}` : ""}<br>
        ${c.shipping.city}, ${c.shipping.state} — ${c.shipping.postalCode}<br>
        Email: ${c.customerEmail}<br>
        Phone: ${c.customerPhone || "N/A"}
      </div>
      <div>
        <div class="section-title">Seller Details</div>
        <strong>${b.storeName}</strong><br>
        ${b.storeAddress.address1}<br>
        ${b.storeAddress.city}, ${b.storeAddress.state} — ${b.storeAddress.postalCode}<br>
        Email: ${b.storeEmail}<br>
        Payment Method: <strong>${invoice.paymentMethod.toUpperCase()}</strong>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Item Description</th>
          <th>SKU</th>
          <th style="text-align: right;">Qty</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.itemsSnapshot.map((item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>
              <strong>${item.name}</strong>
              ${item.attributes?.length ? `<div style="font-size:11px; color:#64748b;">${item.attributes.map(a => `${a.name}: ${a.value}`).join(" | ")}</div>` : ""}
            </td>
            <td><code>${item.sku}</code></td>
            <td style="text-align: right;">${item.quantity}</td>
            <td style="text-align: right;">₹${item.price.toLocaleString("en-IN")}</td>
            <td style="text-align: right;"><strong>₹${item.total.toLocaleString("en-IN")}</strong></td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <table class="total-table">
      <tr>
        <td style="color:#64748b;">Subtotal:</td>
        <td style="text-align: right;">₹${invoice.subtotal.toLocaleString("en-IN")}</td>
      </tr>
      ${invoice.discount > 0 ? `
      <tr>
        <td style="color:#166534;">Discount:</td>
        <td style="text-align: right; color:#166534;">-₹${invoice.discount.toLocaleString("en-IN")}</td>
      </tr>` : ""}
      <tr>
        <td style="color:#64748b;">Shipping:</td>
        <td style="text-align: right;">${invoice.shipping === 0 ? "FREE" : `₹${invoice.shipping}`}</td>
      </tr>
      <tr class="total-row">
        <td>Grand Total:</td>
        <td style="text-align: right; color:#8c5e0f;">₹${invoice.grandTotal.toLocaleString("en-IN")}</td>
      </tr>
    </table>

    <div style="margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center;">
      Thank you for shopping with Zafiro Indio! This is a computer-generated tax invoice.
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
