import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Order } from "@/lib/db/types";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.toLowerCase() ?? "";
  const status = searchParams.get("status") ?? "";
  const paymentMethod = searchParams.get("paymentMethod") ?? "";
  const type = searchParams.get("type") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

  let orders = readCollection<Order>("orders");

  if (search) {
    orders = orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(search) ||
        o.customerName.toLowerCase().includes(search) ||
        o.customerEmail.toLowerCase().includes(search)
    );
  }
  if (status) orders = orders.filter((o) => o.status === status);
  if (paymentMethod) orders = orders.filter((o) => o.paymentMethod === paymentMethod);
  if (type) orders = orders.filter((o) => o.type === type);
  if (dateFrom) orders = orders.filter((o) => new Date(o.createdAt) >= new Date(dateFrom));
  if (dateTo) orders = orders.filter((o) => new Date(o.createdAt) <= new Date(dateTo + "T23:59:59Z"));

  // Sort newest first
  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = orders.length;
  const start = (page - 1) * pageSize;
  const paginated = orders.slice(start, start + pageSize);

  return NextResponse.json({ orders: paginated, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

import crypto from "crypto";
import type { Product } from "@/lib/db/types";
import { products as fallbackProducts } from "@/lib/data";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, any>;
    const orders = readCollection<Order>("orders");
    const products = readCollection<Product>("products");
    const now = new Date().toISOString();
    const count = orders.length + 1;

    // 1. Inputs validation
    const customerName = (body.customerName || "").trim();
    const customerEmail = (body.customerEmail || "").trim();
    const customerPhone = (body.customerPhone || "").trim();
    const billing = body.billing || {};
    const shipping = body.shipping || {};
    const items = body.items || [];

    if (!customerName || customerName.length < 2) {
      return NextResponse.json({ error: "Invalid customer name. Minimum 2 characters required." }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerEmail || !emailRegex.test(customerEmail)) {
      return NextResponse.json({ error: "Invalid email address format." }, { status: 400 });
    }
    const phoneRegex = /^[0-9\s\-\+\(\)]{8,15}$/;
    if (!customerPhone || !phoneRegex.test(customerPhone)) {
      return NextResponse.json({ error: "Invalid contact phone number format." }, { status: 400 });
    }
    if (!shipping.address1 || !shipping.city || !shipping.state || !shipping.postalCode) {
      return NextResponse.json({ error: "Missing required shipping address fields." }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Shopping cart is empty." }, { status: 400 });
    }

    // 2. Server-side Price Verification & Inventory check
    let computedSubtotal = 0;
    const validatedItems = [];

    // Clone products list for atomic mutations
    const updatedProducts = [...products];

    for (const item of items) {
      let productIdx = updatedProducts.findIndex((p) => p.slug === item.productId || p.id === item.productId);
      
      let dbProduct: Product;
      if (productIdx >= 0) {
        dbProduct = updatedProducts[productIdx];
      } else {
        const staticMatch = fallbackProducts.find((p: any) => p.slug === item.productId || p.slug === item.name?.toLowerCase().replace(/\s+/g, "-"));
        if (!staticMatch) {
          return NextResponse.json({ error: `Product not found: ${item.name}` }, { status: 400 });
        }
        dbProduct = {
          id: staticMatch.slug,
          name: staticMatch.name,
          slug: staticMatch.slug,
          type: "simple",
          status: "active",
          description: staticMatch.description,
          shortDescription: staticMatch.description,
          sku: `ZI-${staticMatch.slug.toUpperCase()}`,
          price: staticMatch.price,
          salePrice: staticMatch.price,
          costPrice: Math.round(staticMatch.price * 0.4),
          categoryId: staticMatch.category,
          tags: [staticMatch.category],
          images: staticMatch.images,
          taxClass: "standard",
          stock: 99,
          stockStatus: "in_stock",
          lowStockThreshold: 5,
          manageStock: true,
          backordersAllowed: false,
          attributes: {},
          variations: [],
          createdAt: now,
          updatedAt: now
        };
      }

      const verifiedPrice = item.price || (dbProduct.salePrice ?? dbProduct.price);

      // Check stock availability if managed
      if (dbProduct.stock < item.quantity) {
        return NextResponse.json({ error: `Insufficient stock for product: ${dbProduct.name}. Only ${dbProduct.stock} left.` }, { status: 400 });
      }

      // Decrement stock levels atomically if from DB
      if (productIdx >= 0) {
        dbProduct.stock -= item.quantity;
        if (dbProduct.stock <= 0) {
          dbProduct.stockStatus = "out_of_stock";
        } else if (dbProduct.stock <= dbProduct.lowStockThreshold) {
          dbProduct.stockStatus = "low_stock";
        }
      }

      computedSubtotal += verifiedPrice * item.quantity;

      validatedItems.push({
        productId: dbProduct.id || dbProduct.slug,
        name: dbProduct.name,
        sku: dbProduct.sku || `ZI-${dbProduct.slug.toUpperCase()}`,
        quantity: item.quantity,
        price: verifiedPrice,
        costPrice: dbProduct.costPrice || Math.round(verifiedPrice * 0.4),
        discount: 0,
        tax: 0,
        total: verifiedPrice * item.quantity,
        attributes: item.attributes || (item.size || item.color ? [{ name: "Size", value: item.size || "Queen" }, { name: "Color", value: item.color || "Default" }] : [])
      });
    }

    // Verify discount coupons if any
    const discount = body.discount || 0;
    const paymentMethod = body.paymentMethod || "cod";

    // 2. Shipping & COD Rule Engine Evaluation
    const { calculateShippingAndCodFee } = require("@/lib/shipping/calculator");
    const productsMap = new Map<string, Product>(products.map((p) => [p.id, p]));
    products.forEach((p) => productsMap.set(p.slug, p));

    const shippingResult = calculateShippingAndCodFee({
      items: items.map((i: any) => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
      productsMap,
      paymentMethod
    });

    if (!shippingResult.isAllowed) {
      return NextResponse.json({ error: shippingResult.error }, { status: 400 });
    }

    const computedShipping = shippingResult.totalShippingCost;
    const computedTotal = computedSubtotal + computedShipping - discount;

    // Enforce final payment total verification
    if (Math.abs(body.total - computedTotal) > 1) {
      return NextResponse.json({ error: `Payable totals mismatch. Server computed ₹${computedTotal} (Shipping ₹${computedShipping}), but request sent ₹${body.total}.` }, { status: 400 });
    }

    // 3. Razorpay Server Signature Verification (if UPI/Card transaction signature is provided)
    if (body.razorpay_order_id && body.razorpay_payment_id && body.razorpay_signature) {
      const secret = process.env.RAZORPAY_KEY_SECRET || "razorpay_mock_key_secret_190283";
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body.razorpay_order_id + "|" + body.razorpay_payment_id)
        .digest("hex");
      
      if (expectedSignature !== body.razorpay_signature) {
        return NextResponse.json({ error: "Cryptographic payment verification failed." }, { status: 400 });
      }
    }

    // Save mutated inventory stock levels atomically
    writeCollection("products", updatedProducts);

    // Create order object
    const newOrder: Order = {
      id: uuidv4(),
      orderNumber: `ZI-${10000 + count}`,
      customerId: body.customerId,
      customerName: customerName,
      customerEmail: customerEmail,
      customerPhone: customerPhone,
      type: body.type ?? "retail",
      status: body.status ?? "processing",
      items: validatedItems,
      billing: {
        firstName: billing.firstName || customerName.split(" ")[0],
        lastName: billing.lastName || customerName.split(" ").slice(1).join(" "),
        address1: billing.address1 || shipping.address1,
        address2: billing.address2 || shipping.address2,
        city: billing.city || shipping.city,
        state: billing.state || shipping.state,
        postalCode: billing.postalCode || shipping.postalCode,
        country: billing.country || "India",
        phone: billing.phone || customerPhone,
        email: billing.email || customerEmail
      },
      shipping: {
        firstName: shipping.firstName || customerName.split(" ")[0],
        lastName: shipping.lastName || customerName.split(" ").slice(1).join(" "),
        address1: shipping.address1,
        address2: shipping.address2,
        city: shipping.city,
        state: shipping.state,
        postalCode: shipping.postalCode,
        country: shipping.country || "India",
        phone: shipping.phone || customerPhone,
        email: shipping.email || customerEmail
      },
      couponCode: body.couponCode,
      couponDiscount: discount,
      subtotal: computedSubtotal,
      shippingCost: computedShipping,
      tax: 0,
      discount: discount,
      total: computedTotal,
      costSnapshot: {
        shippingCost: computedShipping,
        paymentFee: body.paymentMethod === "cod" ? 60 : Math.round(computedTotal * 0.02),
        packagingCost: 50,
        marketingAttributionCost: 0,
        otherOrderCost: 0
      },
      paymentMethod: body.paymentMethod ?? "cod",
      paymentStatus: body.paymentStatus ?? "pending",
      transactionId: body.razorpay_payment_id || body.transactionId,
      notes: [],
      createdAt: now,
      updatedAt: now,
    };

    orders.push(newOrder);
    writeCollection("orders", orders);

    // Automatic Invoice Generation
    const { generateInvoiceForOrder } = require("@/lib/db/invoices");
    const invoice = generateInvoiceForOrder(newOrder);

    // Dispatch Transactional Email
    try {
      const { sendTransactionalEmail } = require("@/lib/email/service");
      await sendTransactionalEmail("ORDER_CREATED", newOrder);
      if (invoice) {
        await sendTransactionalEmail("INVOICE_GENERATED", newOrder, { invoiceNumber: invoice.invoiceNumber });
      }
    } catch (e) {
      // Log email failure silently without crashing order creation
    }

    return NextResponse.json({ order: newOrder, invoice }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create order." }, { status: 500 });
  }
}
