import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { prisma } from "../lib/db/prisma";

const DATA_DIR = join(process.cwd(), "data");

function readJson<T>(filename: string): T[] {
  const filePath = join(DATA_DIR, filename);
  if (!existsSync(filePath)) return [];
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T[];
  } catch {
    return [];
  }
}

export async function runMigration() {
  console.log("Starting JSON to PostgreSQL migration...");

  // 1. Admin Users
  const adminUsers = readJson<any>("admin-users.json");
  let adminCount = 0;
  for (const user of adminUsers) {
    if (!user.email) continue;
    await prisma.adminUser.upsert({
      where: { email: user.email },
      update: {
        name: user.name || "Admin User",
        passwordHash: user.passwordHash || user.password || "$2a$10$UnknowHashPlaceholder",
        role: ["super_admin", "admin", "manager", "staff"].includes(user.role) ? user.role : "staff",
        isActive: user.isActive !== false
      },
      create: {
        id: user.id || undefined,
        name: user.name || "Admin User",
        email: user.email,
        passwordHash: user.passwordHash || user.password || "$2a$10$UnknowHashPlaceholder",
        role: ["super_admin", "admin", "manager", "staff"].includes(user.role) ? user.role : "staff",
        isActive: user.isActive !== false
      }
    });
    adminCount++;
  }
  console.log(`Migrated ${adminCount} admin users.`);

  // 2. Categories
  const categories = readJson<any>("categories.json");
  let catCount = 0;
  for (const cat of categories) {
    if (!cat.name && !cat.slug) continue;
    const slug = cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await prisma.category.upsert({
      where: { slug },
      update: {
        name: cat.name || slug,
        description: cat.description || null,
        image: cat.image || null
      },
      create: {
        id: cat.id || undefined,
        name: cat.name || slug,
        slug,
        description: cat.description || null,
        image: cat.image || null
      }
    });
    catCount++;
  }
  console.log(`Migrated ${catCount} categories.`);

  // 3. Customers
  const customers = readJson<any>("customers.json");
  let custCount = 0;
  for (const cust of customers) {
    const phone = cust.phone ? String(cust.phone).trim().replace(/\D/g, "") : null;
    if (!phone && !cust.email) continue;

    const uniquePhone = phone || `cust_phone_${cust.id || Date.now()}`;
    await prisma.customer.upsert({
      where: { phone: uniquePhone },
      update: {
        name: cust.name || null,
        email: cust.email || null,
        status: cust.status || "active",
        notes: cust.notes || null
      },
      create: {
        id: cust.id || undefined,
        name: cust.name || null,
        email: cust.email || null,
        phone: uniquePhone,
        status: cust.status || "active",
        notes: cust.notes || null
      }
    });
    custCount++;
  }
  console.log(`Migrated ${custCount} customers.`);

  // 4. Products & Images
  const products = readJson<any>("products.json");
  let prodCount = 0;
  let imgCount = 0;
  for (const prod of products) {
    if (!prod.name && !prod.id) continue;
    const slug = prod.slug || `${(prod.name || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${prod.id || Date.now()}`;
    const price = Number(prod.price || prod.salePrice || 0);

    const createdProduct = await prisma.product.upsert({
      where: { slug },
      update: {
        name: prod.name || "Untitled Product",
        description: prod.description || null,
        price,
        compareAtPrice: prod.compareAtPrice ? Number(prod.compareAtPrice) : null,
        costPrice: prod.costPrice ? Number(prod.costPrice) : null,
        sku: prod.sku || null,
        stock: Number(prod.stock || prod.inventoryQuantity || 0),
        status: prod.status || "active",
        isFeatured: Boolean(prod.isFeatured),
        tags: Array.isArray(prod.tags) ? prod.tags : []
      },
      create: {
        id: prod.id || undefined,
        name: prod.name || "Untitled Product",
        slug,
        description: prod.description || null,
        price,
        compareAtPrice: prod.compareAtPrice ? Number(prod.compareAtPrice) : null,
        costPrice: prod.costPrice ? Number(prod.costPrice) : null,
        sku: prod.sku || null,
        stock: Number(prod.stock || prod.inventoryQuantity || 0),
        status: prod.status || "active",
        isFeatured: Boolean(prod.isFeatured),
        tags: Array.isArray(prod.tags) ? prod.tags : []
      }
    });

    prodCount++;

    const images: string[] = [];
    if (Array.isArray(prod.images)) {
      images.push(...prod.images);
    } else if (prod.image) {
      images.push(prod.image);
    }

    for (let i = 0; i < images.length; i++) {
      const url = images[i];
      if (!url) continue;
      await prisma.productImage.create({
        data: {
          productId: createdProduct.id,
          url,
          sortOrder: i,
          altText: `${createdProduct.name} image ${i + 1}`
        }
      });
      imgCount++;
    }
  }
  console.log(`Migrated ${prodCount} products with ${imgCount} images.`);

  // 5. Orders & Historical Items Snapshots
  const orders = readJson<any>("orders.json");
  let orderCount = 0;
  for (const ord of orders) {
    if (!ord.id && !ord.orderNumber) continue;
    const orderNumber = ord.orderNumber || String(ord.id);

    const validStatus = [
      "payment_pending", "paid", "processing", "shipped", "out_for_delivery",
      "delivered", "payment_failed", "cancelled", "refund_pending", "refunded",
      "return_requested", "return_approved", "returned"
    ].includes(ord.status) ? ord.status : "processing";

    const createdOrder = await prisma.order.upsert({
      where: { orderNumber },
      update: {
        status: validStatus as any,
        grandTotal: Number(ord.total || ord.grandTotal || 0),
        subtotal: Number(ord.subtotal || ord.total || 0),
        razorpayOrderId: ord.razorpayOrderId || null,
        razorpayPaymentId: ord.razorpayPaymentId || ord.transactionId || null,
        shippingAddress: ord.shippingAddress || { name: ord.customerName || "Customer", phone: ord.customerPhone || "" }
      },
      create: {
        id: ord.id || undefined,
        orderNumber,
        status: validStatus as any,
        subtotal: Number(ord.subtotal || ord.total || 0),
        taxTotal: Number(ord.taxTotal || 0),
        discountTotal: Number(ord.discountTotal || 0),
        shippingFee: Number(ord.shippingFee || 0),
        grandTotal: Number(ord.total || ord.grandTotal || 0),
        paymentMethod: ord.paymentMethod === "cod" ? "cod" : "razorpay",
        paymentStatus: ord.paymentStatus === "paid" ? "captured" : "pending",
        razorpayOrderId: ord.razorpayOrderId || null,
        razorpayPaymentId: ord.razorpayPaymentId || ord.transactionId || null,
        shippingAddress: ord.shippingAddress || { name: ord.customerName || "Customer", phone: ord.customerPhone || "" },
        notes: Array.isArray(ord.notes) ? JSON.stringify(ord.notes) : String(ord.notes || "")
      }
    });

    orderCount++;

    const items = Array.isArray(ord.items) ? ord.items : [];
    for (const item of items) {
      await prisma.orderItem.create({
        data: {
          orderId: createdOrder.id,
          productId: item.productId || null,
          name: item.name || item.productName || "Product Item",
          sku: item.sku || null,
          variation: item.variation || item.size || item.color || null,
          quantity: Number(item.quantity || 1),
          price: Number(item.price || 0),
          tax: Number(item.tax || 0),
          discount: Number(item.discount || 0),
          total: Number(item.total || (item.price * (item.quantity || 1))),
          image: item.image || null
        }
      });
    }
  }
  console.log(`Migrated ${orderCount} orders with historical item snapshots preserved.`);

  console.log("Database migration successfully completed!");
}
