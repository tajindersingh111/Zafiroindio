import fs from "fs";
import path from "path";
import { prisma } from "../lib/db/prisma";

async function main() {
  console.log("🚀 Starting migration from data/*.json to Prisma PostgreSQL database...");

  const dataDir = path.join(process.cwd(), "data");

  // 1. Migrate Products
  const productsFile = path.join(dataDir, "products.json");
  if (fs.existsSync(productsFile)) {
    const productsData = JSON.parse(fs.readFileSync(productsFile, "utf-8"));
    console.log(`Migrating ${productsData.length} products...`);
    for (const p of productsData) {
      await prisma.product.upsert({
        where: { slug: p.slug },
        update: {
          name: p.name,
          description: p.description || "",
          price: Number(p.price || 0),
          stock: Number(p.stock || 0),
          status: p.status || "active",
          tags: Array.isArray(p.tags) ? p.tags : []
        },
        create: {
          id: p.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: p.name,
          slug: p.slug,
          description: p.description || "",
          price: Number(p.price || 0),
          stock: Number(p.stock || 0),
          sku: p.sku || `ZI-${p.slug.toUpperCase().slice(0, 8)}`,
          status: p.status || "active",
          tags: Array.isArray(p.tags) ? p.tags : []
        }
      });
    }
  }

  // 2. Migrate Customers
  const customersFile = path.join(dataDir, "customers.json");
  if (fs.existsSync(customersFile)) {
    const customersData = JSON.parse(fs.readFileSync(customersFile, "utf-8"));
    console.log(`Migrating ${customersData.length} customers...`);
    for (const c of customersData) {
      const cleanPhone = String(c.phone || "").trim().replace(/\D/g, "");
      if (!cleanPhone) continue;

      await prisma.customer.upsert({
        where: { phone: cleanPhone },
        update: {
          name: c.fullName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Customer",
          email: c.email || undefined,
          status: c.status || "active"
        },
        create: {
          id: c.id || `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: c.fullName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Customer",
          email: c.email || undefined,
          phone: cleanPhone,
          status: c.status || "active"
        }
      });
    }
  }

  // 3. Migrate Orders
  const ordersFile = path.join(dataDir, "orders.json");
  if (fs.existsSync(ordersFile)) {
    const ordersData = JSON.parse(fs.readFileSync(ordersFile, "utf-8"));
    console.log(`Migrating ${ordersData.length} orders...`);
    for (const o of ordersData) {
      if (!o.orderNumber) continue;

      const orderItems = Array.isArray(o.items) ? o.items : [];
      await prisma.order.upsert({
        where: { orderNumber: o.orderNumber },
        update: {
          status: o.status === "paid" ? "paid" : "processing",
          paymentStatus: o.paymentStatus === "paid" ? "captured" : "pending",
          grandTotal: Number(o.total || o.subtotal || 0)
        },
        create: {
          id: o.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          orderNumber: o.orderNumber,
          subtotal: Number(o.subtotal || o.total || 0),
          grandTotal: Number(o.total || o.subtotal || 0),
          discountTotal: Number(o.discount || 0),
          shippingFee: Number(o.shippingCost || 0),
          couponCode: o.couponCode || null,
          shippingAddress: o.shipping || o.billing || {},
          billingAddress: o.billing || {},
          items: {
            create: orderItems.map((item: any) => ({
              name: item.name || "Bedsheet Item",
              sku: item.sku || "ZI-BEDSHEET",
              quantity: Number(item.quantity || item.qty || 1),
              price: Number(item.price || 0),
              total: Number(item.total || (item.price || 0) * (item.quantity || item.qty || 1))
            }))
          }
        }
      });
    }
  }

  console.log("✅ Migration complete!");
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
