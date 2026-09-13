"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Printer, Download, ArrowLeft, CheckCircle2, Clock, AlertCircle, FileText, Building2 } from "lucide-react";
import type { Invoice } from "@/lib/db/types";

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/orders/${id}/invoice`)
      .then((res) => {
        if (!res.ok) throw new Error("Invoice not found");
        return res.json();
      })
      .then((data) => {
        setInvoice(data.invoice);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load invoice.");
        setLoading(false);
      });
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-amber-400 font-mono text-sm">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          Generating Tax Invoice Snapshot...
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-4 max-w-md">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-100">Invoice Generation Error</h2>
          <p className="text-sm text-slate-400">{error || "Requested invoice could not be located."}</p>
          <button
            onClick={() => router.push(`/admin/orders/${id}`)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg"
          >
            ← Return to Order Details
          </button>
        </div>
      </div>
    );
  }

  const { businessSnapshot: b, customerSnapshot: c, itemsSnapshot: items } = invoice;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-900 font-sans print:bg-white print:text-black py-8 px-4 sm:px-6">
      {/* Top Controls Bar (Hidden during printing) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <button
          onClick={() => router.push(`/admin/orders/${invoice.orderId}`)}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Order #{invoice.orderNumber}
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm transition-all shadow-md"
          >
            <Printer className="w-4 h-4" /> Print Tax Invoice
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-4 py-2 rounded-lg text-sm border border-slate-700 transition-all"
          >
            <Download className="w-4 h-4" /> Save as PDF
          </button>
        </div>
      </div>

      {/* Main Printable A4 Invoice Container */}
      <div className="max-w-4xl mx-auto bg-white text-slate-900 shadow-2xl rounded-xl print:shadow-none print:rounded-none p-8 sm:p-12 border border-slate-200 print:border-none space-y-8">
        
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-8">
          <div>
            <div className="flex items-center gap-2 text-amber-700 font-serif font-bold text-2xl tracking-tight">
              <Building2 className="w-7 h-7 text-amber-600" /> {b.storeName}
            </div>
            <p className="text-xs text-slate-500 mt-1">{b.storeAddress.company || b.storeName}</p>
            <p className="text-xs text-slate-600 mt-0.5">{b.storeAddress.address1}, {b.storeAddress.address2}</p>
            <p className="text-xs text-slate-600">{b.storeAddress.city}, {b.storeAddress.state} {b.storeAddress.postalCode}, {b.storeAddress.country}</p>
            <p className="text-xs text-slate-600 mt-1">Phone: {b.storePhone} | Email: {b.storeEmail}</p>
            {b.gstin && <p className="text-xs font-mono font-semibold text-slate-700 mt-1">GSTIN: {b.gstin}</p>}
          </div>

          <div className="text-left sm:text-right">
            <span className="inline-block bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs px-3 py-1 rounded uppercase tracking-wider mb-3">
              Tax Invoice
            </span>
            <div className="font-mono text-xl font-bold text-slate-900">{invoice.invoiceNumber}</div>
            <div className="text-xs text-slate-500 mt-1">
              Invoice Date: <span className="font-semibold text-slate-800">{new Date(invoice.invoiceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Order Ref: <span className="font-mono font-semibold text-slate-800">#{invoice.orderNumber}</span>
            </div>
          </div>
        </div>

        {/* Customer & Billing Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs text-slate-700 border-b border-slate-200 pb-8">
          <div>
            <h3 className="font-semibold uppercase tracking-wider text-slate-400 mb-2">Billed To (Customer):</h3>
            <div className="font-bold text-sm text-slate-900">{c.customerName}</div>
            {c.billing ? (
              <address className="not-italic mt-1 leading-relaxed text-slate-600">
                {c.billing.address1} {c.billing.address2 && `, ${c.billing.address2}`}
                <br />
                {c.billing.city}, {c.billing.state} {c.billing.postalCode}
                <br />
                {c.billing.country}
              </address>
            ) : (
              <p className="text-slate-500 mt-1">Same as Shipping Address</p>
            )}
            <p className="mt-1 font-mono text-slate-600">Email: {c.customerEmail}</p>
            {c.customerPhone && <p className="font-mono text-slate-600">Phone: {c.customerPhone}</p>}
          </div>

          <div>
            <h3 className="font-semibold uppercase tracking-wider text-slate-400 mb-2">Shipping Destination:</h3>
            <div className="font-bold text-sm text-slate-900">{c.shipping.firstName} {c.shipping.lastName}</div>
            <address className="not-italic mt-1 leading-relaxed text-slate-600">
              {c.shipping.address1} {c.shipping.address2 && `, ${c.shipping.address2}`}
              <br />
              {c.shipping.city}, {c.shipping.state} {c.shipping.postalCode}
              <br />
              {c.shipping.country}
            </address>
            {c.shipping.phone && <p className="mt-1 font-mono text-slate-600">Phone: {c.shipping.phone}</p>}
          </div>
        </div>

        {/* Product Items Table */}
        <div className="overflow-hidden border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Item & Description</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-right">Rate (₹)</th>
                <th className="py-3 px-4 text-right">Discount (₹)</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 text-slate-400 font-sans">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-sans">
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    {item.attributes && item.attributes.length > 0 && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {item.attributes.map((a) => `${a.name}: ${a.value}`).join(" | ")}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{item.sku}</td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-900">{item.quantity}</td>
                  <td className="py-3.5 px-4 text-right text-slate-700">₹{item.price.toLocaleString("en-IN")}</td>
                  <td className="py-3.5 px-4 text-right text-rose-600">
                    {item.discount > 0 ? `-₹${item.discount.toLocaleString("en-IN")}` : "₹0"}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                    ₹{item.total.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Invoice Summary & Payment Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-2">
          {/* Payment Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
            <h4 className="font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
              Payment Summary
            </h4>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">Payment Method:</span>
              <span className="font-mono font-bold uppercase text-slate-900">{invoice.paymentMethod}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">Payment Status:</span>
              <span className={`font-semibold capitalize px-2 py-0.5 rounded text-[11px] ${invoice.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                {invoice.paymentStatus}
              </span>
            </div>
            <div className="flex justify-between py-1 font-mono">
              <span className="text-slate-600">Amount Paid:</span>
              <span className="font-bold text-emerald-700">₹{invoice.amountPaid.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between py-1 font-mono border-t border-slate-200 pt-2">
              <span className="text-slate-700 font-bold">Amount Due:</span>
              <span className={`font-bold ${invoice.amountDue > 0 ? "text-amber-700" : "text-slate-900"}`}>
                ₹{invoice.amountDue.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Grand Totals */}
          <div className="space-y-2 text-xs font-mono text-slate-700 self-end">
            <div className="flex justify-between py-1">
              <span className="text-slate-600 font-sans">Subtotal:</span>
              <span className="font-semibold text-slate-900">₹{invoice.subtotal.toLocaleString("en-IN")}</span>
            </div>

            {(invoice.discount > 0 || invoice.couponDiscount > 0) && (
              <div className="flex justify-between py-1 text-rose-600">
                <span className="font-sans">Discount:</span>
                <span>-₹{(invoice.discount + invoice.couponDiscount).toLocaleString("en-IN")}</span>
              </div>
            )}

            <div className="flex justify-between py-1">
              <span className="text-slate-600 font-sans">Shipping Charges:</span>
              <span>₹{invoice.shipping.toLocaleString("en-IN")}</span>
            </div>

            {invoice.tax > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-slate-600 font-sans">Tax / GST:</span>
                <span>₹{invoice.tax.toLocaleString("en-IN")}</span>
              </div>
            )}

            <div className="flex justify-between py-3 border-t-2 border-slate-900 text-base font-bold text-slate-900">
              <span className="font-sans">Grand Total:</span>
              <span>₹{invoice.grandTotal.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Footer & Thank You */}
        <div className="border-t border-slate-200 pt-6 text-center text-xs text-slate-500 space-y-1">
          <p className="font-serif italic font-medium text-slate-700">Thank you for purchasing from Zafiro Indio!</p>
          <p>This is a computer-generated Tax Invoice and requires no physical signature.</p>
          <p className="text-[11px] text-slate-400">For support or queries, contact {b.storeEmail} or call {b.storePhone}.</p>
        </div>

      </div>
    </div>
  );
}
