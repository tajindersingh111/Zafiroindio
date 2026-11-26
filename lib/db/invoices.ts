import type { Invoice, InvoiceGst, Order, Product, BusinessSnapshot, Address } from "@/lib/db/types";
import { readCollection, upsertDoc, nextSequence, readSettings, getDoc } from "@/lib/db/store";
import { computeGst, gstRateFor, DEFAULT_GST_RATE } from "@/lib/tax/gst";

/**
 * The registered business, exactly as on the GST registration certificate (REG-06, issued 18/11/2026).
 * A sole proprietorship: the trade name is what invoices are issued under, and the proprietor is named
 * beneath it. This is the fallback; whatever is set in Admin → Settings takes precedence (below).
 *
 * There is deliberately no PAN here: a GSTIN already embeds it, a tax invoice does not need it, and it
 * is the proprietor's personal number to print on every customer's copy.
 */
const DEFAULT_BUSINESS_SNAPSHOT: BusinessSnapshot = {
  storeName: "Zafiro Indio",
  storeEmail: "info@zafiroindio.com",
  storePhone: "",
  storeAddress: {
    firstName: "Zafiro",
    lastName: "Indio",
    company: "Zafiro India Industries Jaipur",
    address1: "38, Govind Vatika",
    address2: "Delhi Bypass Road",
    city: "Jaipur",
    state: "Rajasthan",
    postalCode: "302002",
    country: "India"
  },
  legalName: "Karmjeet Singh",
  gstin: "08AZBPS1281M3ZX",
  // /images/logo.png was never in the repo, so every invoice drew a broken image.
  logoUrl: "/zafiro-logo-dark.png"
};

type BusinessSettings = {
  businessLegalName?: string;
  gstin?: string;
  storeEmail?: string;
  storePhone?: string;
  storeAddress?: { address1?: string; address2?: string; city?: string; state?: string; postalCode?: string; country?: string };
};

const GSTIN_FORMAT = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
/** The 98765 xxxxx numbers that shipped as demo defaults; never print one on an invoice. */
const isDemoPhone = (digits: string) => /^(91)?98765\d{5}$/.test(digits) || /^(\d)\1+$/.test(digits.slice(-10));

/**
 * The business block an invoice is issued with: the registered details above, overridden by whatever
 * Admin → Settings holds, so the address and GSTIN are edited in one place and the contact page,
 * the policies and every new invoice agree. A malformed GSTIN is ignored rather than printed.
 */
export async function getBusinessSnapshot(): Promise<BusinessSnapshot> {
  const s = (await readSettings<BusinessSettings>("settings").catch(() => null)) ?? {};
  const base = DEFAULT_BUSINESS_SNAPSHOT;
  const a = s.storeAddress ?? {};
  const hasAddress = !!str(a.address1) && !!str(a.postalCode);
  const gstin = str(s.gstin).toUpperCase();
  const phoneDigits = str(s.storePhone).replace(/\D/g, "");

  return {
    ...base,
    storeEmail: str(s.storeEmail) || base.storeEmail,
    storePhone: phoneDigits.length >= 10 && !isDemoPhone(phoneDigits) ? str(s.storePhone) : base.storePhone,
    gstin: GSTIN_FORMAT.test(gstin) ? gstin : base.gstin,
    storeAddress: {
      ...base.storeAddress,
      company: str(s.businessLegalName) || base.storeAddress.company,
      ...(hasAddress
        ? {
            address1: str(a.address1),
            address2: str(a.address2) || undefined,
            city: str(a.city) || base.storeAddress.city,
            state: str(a.state) || base.storeAddress.state,
            postalCode: str(a.postalCode),
          }
        : {}),
    },
  };
}

const DEFAULT_ADDRESS: Address = {
  firstName: "Customer",
  lastName: "",
  address1: "Address Line 1",
  city: "Jaipur",
  state: "Rajasthan",
  postalCode: "302001",
  country: "India"
};

/**
 * The GST an order contains, itemised line by line.
 *
 * The rate comes from each product's tax class (Reduced 5%, Standard 18%, Zero/None 0%), falling back to
 * `defaultGstRate` in Admin -> Settings, or 5%, for a product that has none set. The buyer's state
 * decides between CGST + SGST and IGST.
 */
export async function buildInvoiceGst(
  order: { items: any[]; total: number; shipping?: Partial<Address> },
  sellerGstin: string
): Promise<{ gst: InvoiceGst; lines: ReturnType<typeof computeGst>["lines"]; hsn: (string | undefined)[] }> {
  const settings = (await readSettings<{ defaultGstRate?: number }>("settings").catch(() => null)) ?? {};
  const configured = Number(settings.defaultGstRate);
  const fallback = Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_GST_RATE;

  const products = await Promise.all(
    (order.items || []).map((i) => (i.productId ? getDoc<Product>("products", String(i.productId)).catch(() => null) : Promise.resolve(null)))
  );

  const result = computeGst({
    lines: (order.items || []).map((i, n) => ({
      total: Number(i.total) || Number(i.price) * Number(i.quantity) || 0,
      rate: gstRateFor(products[n]?.taxClass, fallback),
    })),
    invoiceTotal: order.total,
    sellerGstin,
    buyerState: String(order.shipping?.state ?? ""),
  });

  const { regime, placeOfSupply, taxable, cgst, sgst, igst, tax, bands } = result;
  return {
    gst: { regime, placeOfSupply, taxable, cgst, sgst, igst, tax, bands },
    lines: result.lines,
    hsn: (order.items || []).map((i, n) => (i.hsn || products[n]?.hsn || "").trim() || undefined),
  };
}

export async function getAllInvoices(): Promise<Invoice[]> {
  return readCollection<Invoice>("invoices");
}

export async function generateInvoiceNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const seq = await nextSequence(`invoice-${currentYear}`, 1);
  return `ZI-${currentYear}-${String(seq).padStart(6, "0")}`;
}

export async function generateInvoiceForOrder(order: Partial<Order> & { id: string; orderNumber: string; customerName: string; customerEmail: string; total: number; subtotal: number; items: any[]; paymentStatus?: any; status?: any; paymentMethod?: any }): Promise<Invoice> {
  const existing = (await getAllInvoices()).find((inv) => inv.orderId === order.id || inv.orderNumber === order.orderNumber);

  if (existing) {
    let amountPaid = existing.amountPaid;
    let amountDue = existing.amountDue;

    if (order.paymentStatus === "paid") {
      amountPaid = existing.grandTotal;
      amountDue = 0;
    } else if (order.paymentStatus === "refunded") {
      amountPaid = 0;
      amountDue = 0;
    }

    const updatedInvoice: Invoice = {
      ...existing,
      paymentStatus: order.paymentStatus || existing.paymentStatus,
      orderStatus: order.status || existing.orderStatus,
      amountPaid,
      amountDue,
      updatedAt: new Date().toISOString()
    };

    await upsertDoc("invoices", updatedInvoice);
    return updatedInvoice;
  }

  const invoiceNumber = await generateInvoiceNumber();
  const grandTotal = order.total;

  let amountPaid = 0;
  let amountDue = grandTotal;

  if (order.paymentStatus === "paid") {
    amountPaid = grandTotal;
    amountDue = 0;
  }

  const now = new Date().toISOString();
  const business = await getBusinessSnapshot();
  const tax = await buildInvoiceGst({ items: order.items || [], total: grandTotal, shipping: order.shipping }, business.gstin || "");

  const newInvoice: Invoice = {
    id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    invoiceNumber,
    orderId: order.id,
    orderNumber: order.orderNumber || order.id,
    customerId: order.customerId,
    invoiceDate: order.createdAt || now,
    businessSnapshot: business,
    customerSnapshot: {
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      billing: order.billing || DEFAULT_ADDRESS,
      shipping: order.shipping || DEFAULT_ADDRESS
    },
    itemsSnapshot: (order.items || []).map((item, n) => ({
      productId: item.productId,
      variationId: item.variationId,
      name: item.name,
      sku: item.sku,
      hsn: tax.hsn[n],
      quantity: item.quantity,
      price: item.price,
      discount: item.discount || 0,
      tax: item.tax || 0,
      total: item.total || item.price * item.quantity,
      taxRate: tax.lines[n].rate,
      taxableValue: tax.lines[n].taxable,
      cgst: tax.lines[n].cgst,
      sgst: tax.lines[n].sgst,
      igst: tax.lines[n].igst,
      attributes: item.attributes
    })),
    subtotal: order.subtotal,
    discount: order.discount || 0,
    couponDiscount: order.couponDiscount || 0,
    shipping: order.shippingCost || 0,
    tax: order.tax || 0,
    grandTotal,
    gst: tax.gst,
    amountPaid,
    amountDue,
    paymentMethod: order.paymentMethod || "cod",
    paymentStatus: order.paymentStatus || "pending",
    orderStatus: order.status || "pending",
    createdAt: now,
    updatedAt: now
  };

  await upsertDoc("invoices", newInvoice);
  return newInvoice;
}

export async function getInvoiceByOrderId(orderId: string, orderFallback?: Order): Promise<Invoice | null> {
  const found = (await getAllInvoices()).find((i) => i.orderId === orderId || i.orderNumber === orderId);

  if (found) return found;

  if (orderFallback) {
    return await generateInvoiceForOrder(orderFallback);
  }

  return null;
}
