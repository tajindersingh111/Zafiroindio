import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Product } from "@/lib/db/types";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawItems: any[] = Array.isArray(body) ? body : body.products || [];

    if (!rawItems || rawItems.length === 0) {
      return NextResponse.json({ error: "No product data provided." }, { status: 400 });
    }

    const existingProducts = readCollection<Product>("products");
    const now = new Date().toISOString();

    const createdProducts: Product[] = [];
    const errors: string[] = [];

    for (let idx = 0; idx < rawItems.length; idx++) {
      const item = rawItems[idx];
      const rowNum = idx + 1;

      const name = (item.name || "").trim();
      if (!name) {
        errors.push(`Row ${rowNum}: Product name is required.`);
        continue;
      }

      const price = Number(item.price);
      if (isNaN(price) || price < 0) {
        errors.push(`Row ${rowNum}: Invalid price for product '${name}'.`);
        continue;
      }

      const slug = (item.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")) + `-${Math.random().toString(36).substring(2, 6)}`;
      const sku = (item.sku || `ZI-${Math.floor(100000 + Math.random() * 900000)}`).trim();
      const salePrice = item.salePrice ? Number(item.salePrice) : undefined;
      const stock = item.stock !== undefined ? Number(item.stock) : 50;
      const categoryId = item.categoryId || item.category || "cat-1";
      const description = item.description || `${name} — Premium handcrafted bedsheet by Zafiro.`;

      let images: string[] = [];
      if (Array.isArray(item.images)) {
        images = item.images;
      } else if (typeof item.images === "string" && item.images.trim()) {
        images = item.images.split(",").map((s: string) => s.trim());
      } else if (item.image) {
        images = [item.image.trim()];
      }

      if (images.length === 0) {
        images = ["https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85"];
      }

      const newProduct: Product = {
        id: uuidv4(),
        name,
        slug,
        type: "simple",
        status: "active",
        description,
        shortDescription: description.slice(0, 120),
        sku,
        price,
        salePrice: salePrice && salePrice < price ? salePrice : undefined,
        costPrice: Math.round(price * 0.4),
        categoryId,
        tags: item.tags ? (Array.isArray(item.tags) ? item.tags : item.tags.split(",")) : ["bedsheet", "cotton"],
        images,
        taxClass: "standard",
        stock,
        stockStatus: stock > 10 ? "in_stock" : stock > 0 ? "low_stock" : "out_of_stock",
        lowStockThreshold: 10,
        manageStock: true,
        backordersAllowed: false,
        attributes: {},
        variations: [],
        createdAt: now,
        updatedAt: now,
      };

      createdProducts.push(newProduct);
    }

    if (createdProducts.length > 0) {
      const updatedList = [...createdProducts, ...existingProducts];
      writeCollection("products", updatedList);
    }

    return NextResponse.json({
      success: true,
      importedCount: createdProducts.length,
      errorCount: errors.length,
      errors,
      products: createdProducts
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to perform bulk product import." }, { status: 500 });
  }
}
