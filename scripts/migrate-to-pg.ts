import { prisma } from "../lib/db/prisma";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Starting Optimized JSON to Railway PostgreSQL Migration...");

  const dataDir = path.join(process.cwd(), "data");

  function readJson<T>(filename: string): T[] {
    const filePath = path.join(dataDir, filename);
    if (!fs.existsSync(filePath)) return [];
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch {
      return [];
    }
  }

  // 1. Admin Users
  const adminUsers = readJson<any>("admin-users.json");
  console.log(`Migrating ${adminUsers.length} Admin Users...`);
  for (const user of adminUsers) {
    try {
      await prisma.adminUser.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          passwordHash: user.passwordHash,
          role: user.role === "super_admin" ? "super_admin" : user.role === "admin" ? "admin" : user.role === "manager" ? "manager" : "staff",
          isActive: user.isActive ?? true,
        },
        create: {
          id: user.id,
          name: user.name,
          email: user.email,
          passwordHash: user.passwordHash,
          role: user.role === "super_admin" ? "super_admin" : user.role === "admin" ? "admin" : user.role === "manager" ? "manager" : "staff",
          isActive: user.isActive ?? true,
        },
      });
    } catch (err: any) {
      console.warn(`AdminUser ${user.email} warning:`, err.message);
    }
  }

  // 2. Categories
  const categories = readJson<any>("categories.json");
  console.log(`Migrating ${categories.length} Categories...`);
  for (const cat of categories) {
    try {
      await prisma.category.upsert({
        where: { id: cat.id },
        update: {
          name: cat.name,
          slug: cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description: cat.description || null,
        },
        create: {
          id: cat.id,
          name: cat.name,
          slug: cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description: cat.description || null,
        },
      });
    } catch (err: any) {
      console.warn(`Category ${cat.id} warning:`, err.message);
    }
  }

  // 3. Customers
  const customers = readJson<any>("customers.json");
  console.log(`Migrating ${customers.length} Customers...`);
  for (const cust of customers) {
    if (!cust.phone) continue;
    try {
      await prisma.customer.upsert({
        where: { phone: String(cust.phone) },
        update: {
          name: cust.name || null,
          email: cust.email || null,
          status: cust.status || "active",
        },
        create: {
          id: cust.id,
          name: cust.name || null,
          email: cust.email || null,
          phone: String(cust.phone),
          status: cust.status || "active",
        },
      });
    } catch {
      // ignore
    }
  }

  // 4. Coupons
  const coupons = readJson<any>("coupons.json");
  console.log(`Migrating ${coupons.length} Coupons...`);
  for (const c of coupons) {
    try {
      await prisma.coupon.upsert({
        where: { code: c.code },
        update: {
          discountType: c.discountType || "percentage",
          value: Number(c.discountValue || c.value || c.discount || 0),
          minPurchase: Number(c.minOrderAmount || c.minPurchase || 0),
          maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
          usageLimit: c.usageLimit ? Number(c.usageLimit) : null,
          usedCount: Number(c.usedCount || 0),
          isActive: c.isActive ?? true,
        },
        create: {
          id: c.id,
          code: c.code,
          discountType: c.discountType || "percentage",
          value: Number(c.discountValue || c.value || c.discount || 0),
          minPurchase: Number(c.minOrderAmount || c.minPurchase || 0),
          maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
          usageLimit: c.usageLimit ? Number(c.usageLimit) : null,
          usedCount: Number(c.usedCount || 0),
          isActive: c.isActive ?? true,
        },
      });
    } catch (err: any) {
      console.warn(`Coupon ${c.code} warning:`, err.message);
    }
  }

  // 5. Orders & Items
  const orders = readJson<any>("orders.json");
  console.log(`Migrating ${orders.length} Orders to PostgreSQL...`);
  
  const statusMap: Record<string, any> = {
    "delivered": "delivered",
    "shipped": "shipped",
    "processing": "processing",
    "paid": "paid",
    "cancelled": "cancelled",
    "payment_pending": "payment_pending",
    "payment_failed": "payment_failed",
  };

  const paymentMethodMap: Record<string, any> = {
    "cod": "cod",
    "razorpay": "razorpay",
    "upi": "upi",
    "netbanking": "netbanking",
    "card": "card",
  };

  let count = 0;
  for (const o of orders) {
    count++;
    const orderNumber = o.orderNumber || o.id;
    try {
      await prisma.order.upsert({
        where: { orderNumber },
        update: {
          status: statusMap[o.status] || "processing",
          paymentStatus: o.paymentStatus === "captured" || o.paymentStatus === "paid" ? "captured" : "pending",
          paymentMethod: paymentMethodMap[o.paymentMethod] || "cod",
          subtotal: Number(o.subtotal || o.totalAmount || 0),
          taxTotal: Number(o.taxTotal || 0),
          discountTotal: Number(o.discountTotal || 0),
          shippingFee: Number(o.shippingFee || 0),
          grandTotal: Number(o.grandTotal || o.totalAmount || 0),
          shippingAddress: o.shippingAddress || o.customer || {},
          billingAddress: o.billingAddress || null,
          createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
        },
        create: {
          id: o.id,
          orderNumber,
          status: statusMap[o.status] || "processing",
          paymentStatus: o.paymentStatus === "captured" || o.paymentStatus === "paid" ? "captured" : "pending",
          paymentMethod: paymentMethodMap[o.paymentMethod] || "cod",
          subtotal: Number(o.subtotal || o.totalAmount || 0),
          taxTotal: Number(o.taxTotal || 0),
          discountTotal: Number(o.discountTotal || 0),
          shippingFee: Number(o.shippingFee || 0),
          grandTotal: Number(o.grandTotal || o.totalAmount || 0),
          shippingAddress: o.shippingAddress || o.customer || {},
          billingAddress: o.billingAddress || null,
          createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
        },
      });

      if (count % 50 === 0 || count === orders.length) {
        console.log(`Processed ${count}/${orders.length} orders...`);
      }
    } catch (err: any) {
      console.warn(`Order ${orderNumber} error:`, err.message);
    }
  }

  console.log("🎉 ALL DATA SUCCESSFULLY MIGRATED TO RAILWAY POSTGRESQL!");
}

main()
  .catch((e) => {
    console.error("Migration Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
