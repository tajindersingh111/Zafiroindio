import type { Invoice, Order, BusinessSnapshot, Address } from "@/lib/db/types";

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

const DEFAULT_ADDRESS: Address = {
  firstName: "Customer",
  lastName: "",
  address1: "Address Line 1",
  city: "Jaipur",
  state: "Rajasthan",
  postalCode: "302001",
  country: "India"
};

const invoicesBuffer: Invoice[] = [];

export function getAllInvoices(): Invoice[] {
  return invoicesBuffer;
}

export function generateInvoiceNumber(invoices: Invoice[]): string {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `ZI-${currentYear}-`;

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

export function generateInvoiceForOrder(order: Partial<Order> & { id: string; orderNumber: string; customerName: string; customerEmail: string; total: number; subtotal: number; items: any[]; paymentStatus?: any; status?: any; paymentMethod?: any }): Invoice {
  const existing = invoicesBuffer.find((inv) => inv.orderId === order.id || inv.orderNumber === order.orderNumber);

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

    const idx = invoicesBuffer.findIndex((i) => i.id === existing.id);
    if (idx >= 0) invoicesBuffer[idx] = updatedInvoice;
    return updatedInvoice;
  }

  const invoiceNumber = generateInvoiceNumber(invoicesBuffer);
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
    businessSnapshot: DEFAULT_BUSINESS_SNAPSHOT,
    customerSnapshot: {
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      billing: order.billing || DEFAULT_ADDRESS,
      shipping: order.shipping || DEFAULT_ADDRESS
    },
    itemsSnapshot: (order.items || []).map((item) => ({
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
    paymentMethod: order.paymentMethod || "cod",
    paymentStatus: order.paymentStatus || "pending",
    orderStatus: order.status || "pending",
    createdAt: now,
    updatedAt: now
  };

  invoicesBuffer.unshift(newInvoice);
  return newInvoice;
}

export function getInvoiceByOrderId(orderId: string, orderFallback?: Order): Invoice | null {
  const found = invoicesBuffer.find((i) => i.orderId === orderId || i.orderNumber === orderId);

  if (found) return found;

  if (orderFallback) {
    return generateInvoiceForOrder(orderFallback);
  }

  return null;
}
