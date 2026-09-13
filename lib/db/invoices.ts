import { readCollection, writeCollection } from "@/lib/db/store";
import type { Invoice, Order, StoreSettings, BusinessSnapshot } from "@/lib/db/types";

const DEFAULT_BUSINESS_SNAPSHOT: BusinessSnapshot = {
  storeName: "Zafiro Indio",
  storeEmail: "support@zafiroindio.com",
  storePhone: "+91 98765 43210",
  storeAddress: {
    firstName: "Zafiro",
    lastName: "Indio HQ",
    company: "Zafiro Indio Private Limited",
    address1: "Plot 42, Craft Heritage Zone, Sanganer",
    address2: "Tonk Road",
    city: "Jaipur",
    state: "Rajasthan",
    postalCode: "302029",
    country: "India",
    phone: "+91 98765 43210",
    email: "support@zafiroindio.com"
  },
  gstin: "08ABCDE1234F1Z5",
  pan: "ABCDE1234F",
  logoUrl: "/images/logo.png"
};

export function getAllInvoices(): Invoice[] {
  try {
    return readCollection<Invoice>("invoices");
  } catch (err) {
    console.error("Failed to read invoices collection:", err);
    return [];
  }
}

export function generateInvoiceNumber(invoices: Invoice[]): string {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `ZI-${currentYear}-`;

  // Find max sequential counter for current year
  let maxSeq = 0;
  invoices.forEach((inv) => {
    if (inv.invoiceNumber && inv.invoiceNumber.startsWith(yearPrefix)) {
      const parts = inv.invoiceNumber.split("-");
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  });

  const nextSeq = maxSeq + 1;
  const seqPadded = String(nextSeq).padStart(6, "0");
  return `${yearPrefix}${seqPadded}`;
}

export function generateInvoiceForOrder(order: Order): Invoice {
  const invoices = getAllInvoices();
  const existing = invoices.find((inv) => inv.orderId === order.id || inv.orderNumber === order.orderNumber);

  if (existing) {
    // If order status or payment status updated, update payment metrics on existing snapshot without changing price history
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
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      amountPaid,
      amountDue,
      updatedAt: new Date().toISOString()
    };

    const idx = invoices.findIndex((i) => i.id === existing.id);
    if (idx >= 0) invoices[idx] = updatedInvoice;
    writeCollection("invoices", invoices);
    return updatedInvoice;
  }

  // Load store settings if present
  let businessSnapshot = { ...DEFAULT_BUSINESS_SNAPSHOT };
  try {
    const settings = readCollection<StoreSettings>("settings");
    if (settings && settings.length > 0) {
      const s = settings[0];
      businessSnapshot = {
        storeName: s.storeName || DEFAULT_BUSINESS_SNAPSHOT.storeName,
        storeEmail: s.storeEmail || DEFAULT_BUSINESS_SNAPSHOT.storeEmail,
        storePhone: s.storePhone || DEFAULT_BUSINESS_SNAPSHOT.storePhone,
        storeAddress: s.storeAddress || DEFAULT_BUSINESS_SNAPSHOT.storeAddress,
        gstin: DEFAULT_BUSINESS_SNAPSHOT.gstin,
        pan: DEFAULT_BUSINESS_SNAPSHOT.pan,
        logoUrl: s.logoUrl || DEFAULT_BUSINESS_SNAPSHOT.logoUrl
      };
    }
  } catch (e) {
    // Fallback to default
  }

  const invoiceNumber = generateInvoiceNumber(invoices);
  const grandTotal = order.total;

  let amountPaid = 0;
  let amountDue = grandTotal;

  if (order.paymentStatus === "paid") {
    amountPaid = grandTotal;
    amountDue = 0;
  }

  const now = new Date().toISOString();

  const newInvoice: Invoice = {
    id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    invoiceNumber,
    orderId: order.id,
    orderNumber: order.orderNumber || order.id,
    customerId: order.customerId,
    invoiceDate: order.createdAt || now,
    businessSnapshot,
    customerSnapshot: {
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      billing: order.billing,
      shipping: order.shipping
    },
    itemsSnapshot: order.items.map((item) => ({
      productId: item.productId,
      variationId: item.variationId,
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      price: item.price,
      discount: item.discount || 0,
      tax: item.tax || 0,
      total: item.total || item.price * item.quantity,
      attributes: item.attributes
    })),
    subtotal: order.subtotal,
    discount: order.discount || 0,
    couponDiscount: order.couponDiscount || 0,
    shipping: order.shippingCost || 0,
    tax: order.tax || 0,
    grandTotal,
    amountPaid,
    amountDue,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.status,
    createdAt: now,
    updatedAt: now
  };

  invoices.unshift(newInvoice);
  writeCollection("invoices", invoices);
  return newInvoice;
}

export function getInvoiceByOrderId(orderId: string, orderFallback?: Order): Invoice | null {
  const invoices = getAllInvoices();
  const found = invoices.find((i) => i.orderId === orderId || i.orderNumber === orderId);

  if (found) return found;

  if (orderFallback) {
    return generateInvoiceForOrder(orderFallback);
  }

  return null;
}
