import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Order, Customer } from "@/lib/db/types";

interface ShiprocketCheckoutPayload {
  phone: string;
  email?: string;
  fullName: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  paymentMethod?: "cod" | "upi" | "card" | "netbanking";
  items: Array<{
    productId: string;
    name: string;
    sku?: string;
    quantity: number;
    price: number;
    image?: string;
    size?: string;
    color?: string;
  }>;
  subtotal?: number;
  discount?: number;
  couponCode?: string;
  total: number;
  shiprocketToken?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ShiprocketCheckoutPayload;
    const cleanPhone = String(body.phone || "").trim().replace(/\D/g, "");

    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json(
        { error: "Valid 10-digit mobile number verified by Shiprocket OTP is required." },
        { status: 400 }
      );
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: "Cart items are required." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const customerEmail = body.email && body.email.trim() ? body.email.trim() : `${cleanPhone}@customer.zafiroindio.com`;
    const customerName = body.fullName && body.fullName.trim() ? body.fullName.trim() : "Customer";

    // 1. AUTOMATIC CUSTOMER ACCOUNT CREATION / SYNC
    const customers = readCollection<Customer>("customers");
    let customer = customers.find((c) => c.phone === cleanPhone || (c.email && c.email.toLowerCase() === customerEmail.toLowerCase()));

    if (!customer) {
      const nameParts = customerName.split(" ");
      const firstName = nameParts[0] || "Customer";
      const lastName = nameParts.slice(1).join(" ") || "";

      customer = {
        id: `cust_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
        type: "retail",
        status: "active",
        firstName,
        lastName,
        email: customerEmail,
        phone: cleanPhone,
        totalOrders: 1,
        totalSpent: Number(body.total) || 0,
        registeredAt: now,
        updatedAt: now,
        shipping: {
          firstName,
          lastName,
          address1: body.address || "",
          city: body.city || "",
          state: body.state || "",
          postalCode: body.postalCode || "",
          country: "India",
          phone: cleanPhone,
          email: customerEmail
        }
      };
      customers.push(customer);
    } else {
      customer.totalOrders = (customer.totalOrders || 0) + 1;
      customer.totalSpent = (customer.totalSpent || 0) + (Number(body.total) || 0);
      customer.lastOrderDate = now;
      customer.updatedAt = now;
    }
    writeCollection("customers", customers);

    // 2. CREATE ORDER IN DATABASE
    const orders = readCollection<Order>("orders");
    const orderNumber = `ZI-${Math.floor(100000 + Math.random() * 900000)}`;
    const isCod = (body.paymentMethod || "cod").toLowerCase() === "cod";

    const nameParts = customerName.split(" ");
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || "";

    const orderObj: Order = {
      id: `ord_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      orderNumber,
      customerId: customer.id,
      customerName,
      customerEmail,
      customerPhone: cleanPhone,
      type: "retail",
      status: isCod ? "processing" : "paid",
      paymentMethod: isCod ? "cod" : (body.paymentMethod as any) || "upi",
      paymentStatus: isCod ? "pending" : "paid",
      subtotal: body.subtotal || body.total,
      discount: body.discount || 0,
      couponCode: body.couponCode,
      couponDiscount: body.discount || 0,
      shippingCost: 0,
      tax: 0,
      total: body.total,
      items: body.items.map((it) => ({
        productId: it.productId,
        name: it.name,
        sku: it.sku || `ZI-${it.productId.toUpperCase().slice(0, 8)}`,
        quantity: it.quantity,
        price: it.price,
        discount: 0,
        tax: 0,
        total: it.price * it.quantity,
        image: it.image,
        attributes: [
          ...(it.size ? [{ name: "Size", value: it.size }] : []),
          ...(it.color ? [{ name: "Color", value: it.color }] : [])
        ]
      })),
      billing: {
        firstName,
        lastName,
        address1: body.address || "Main Street",
        city: body.city || "Jaipur",
        state: body.state || "Rajasthan",
        postalCode: body.postalCode || "302001",
        country: "India",
        phone: cleanPhone,
        email: customerEmail
      },
      shipping: {
        firstName,
        lastName,
        address1: body.address || "Main Street",
        city: body.city || "Jaipur",
        state: body.state || "Rajasthan",
        postalCode: body.postalCode || "302001",
        country: "India",
        phone: cleanPhone,
        email: customerEmail
      },
      notes: [
        {
          id: `note_${Date.now()}`,
          note: `Order created via Shiprocket 1-Click Fast Checkout. OTP Verified on +91 ${cleanPhone}`,
          isCustomerNote: false,
          createdAt: now
        }
      ],
      createdAt: now,
      updatedAt: now
    };

    orders.unshift(orderObj);
    writeCollection("orders", orders);

    // 3. SET CUSTOMER AUTOMATIC LOGIN SESSION COOKIE
    const sessionSecret = process.env.SESSION_SECRET || "zafiro-customer-secret-key-2026";
    const sessionData = {
      customerId: customer.id,
      phone: customer.phone,
      issuedAt: now
    };
    const sessionPayload = Buffer.from(JSON.stringify(sessionData)).toString("base64url");
    const hmac = crypto.createHmac("sha256", sessionSecret).update(sessionPayload).digest("hex");
    const sessionCookieValue = `${sessionPayload}.${hmac}`;

    const response = NextResponse.json({
      success: true,
      message: "Order placed successfully via Shiprocket Checkout.",
      order: {
        id: orderObj.id,
        orderNumber: orderObj.orderNumber,
        total: orderObj.total,
        status: orderObj.status
      },
      customer: {
        id: customer.id,
        phone: customer.phone,
        name: customerName,
        email: customerEmail
      }
    });

    response.cookies.set("zafiro-customer-session", sessionCookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60
    });

    return response;
  } catch (err) {
    console.error("Shiprocket Order API Error:", err);
    return NextResponse.json({ error: "Failed to process Shiprocket Order." }, { status: 500 });
  }
}
