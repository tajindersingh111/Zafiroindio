import { prisma } from "../lib/db/prisma";
import fs from "fs";
import path from "path";

function parseCSV(text: string): Record<string, string>[] {
  const lines: string[] = [];
  let currentLine = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      if (currentLine.trim()) lines.push(currentLine);
      currentLine = "";
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) lines.push(currentLine);

  if (lines.length === 0) return [];

  function parseLine(line: string): string[] {
    const values: string[] = [];
    let cur = "";
    let q = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (q && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          q = !q;
        }
      } else if (c === ',' && !q) {
        values.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    values.push(cur.trim());
    return values;
  }

  const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, "").trim());
  const results: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      let val = row[idx] || "";
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1).replace(/""/g, '"');
      }
      obj[header] = val;
    });
    results.push(obj);
  }

  return results;
}

async function main() {
  console.log("📦 Starting WooCommerce CSV Import to products.json & Railway PostgreSQL...");

  const csvPath = path.join(process.cwd(), "wc-product-export-1-10-2026-1790842765327.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("CSV file not found!");
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const records = parseCSV(csvContent);
  console.log(`Found ${records.length} raw product rows in CSV.`);

  // 1. Clear existing products in DB & JSON
  console.log("Cleaning up existing products in PostgreSQL...");
  try {
    await prisma.productImage.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.orderItem.updateMany({ data: { productId: null } });
    await prisma.product.deleteMany();
  } catch (err: any) {
    console.warn("DB Cleanup warning:", err.message);
  }

  const jsonProducts: any[] = [];
  const usedSlugs = new Set<string>();
  const categoryMap = new Map<string, string>(); // name -> id

  // Load existing categories
  const categoriesPath = path.join(process.cwd(), "data", "categories.json");
  let categoriesData: any[] = [];
  if (fs.existsSync(categoriesPath)) {
    try { categoriesData = JSON.parse(fs.readFileSync(categoriesPath, "utf-8")); } catch {}
  }
  categoriesData.forEach(c => categoryMap.set(c.name.toLowerCase(), c.id));

  let importedCount = 0;

  for (const row of records) {
    const id = row["ID"] || `prod-${Math.random().toString(36).substring(2, 9)}`;
    const name = row["Name"];
    if (!name || row["Type"] === "variation") continue;

    const type = row["Type"] || "simple";
    const sku = row["SKU"] || null;
    const regularPrice = parseFloat(row["Regular price"]) || 0;
    const salePrice = parseFloat(row["Sale price"]) || null;
    const price = salePrice && salePrice > 0 ? salePrice : (regularPrice || 999);
    const compareAtPrice = regularPrice > price ? regularPrice : null;
    const stock = parseInt(row["Stock"]) || 10;
    const isFeatured = row["Is featured?"] === "1";
    const shortDesc = row["Short description"] || "";
    const description = row["Description"] || shortDesc;
    
    // Process Images
    const rawImages = (row["Images"] || "").split(",").map(s => s.trim()).filter(Boolean);
    const images = rawImages.length > 0 ? rawImages : ["/images/products/placeholder.jpg"];

    // Process Categories
    const rawCats = (row["Categories"] || "").split(",").map(s => s.trim().split(">").pop()?.trim()).filter(Boolean);
    let categoryId: string | null = null;
    if (rawCats.length > 0) {
      const catName = rawCats[0] as string;
      const key = catName.toLowerCase();
      if (categoryMap.has(key)) {
        categoryId = categoryMap.get(key)!;
      } else {
        const newCatId = `cat-${Math.floor(100 + Math.random() * 900)}`;
        const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const newCat = { id: newCatId, name: catName, slug, description: "" };
        categoriesData.push(newCat);
        categoryMap.set(key, newCatId);
        categoryId = newCatId;

        // Upsert to DB
        try {
          await prisma.category.upsert({
            where: { id: newCatId },
            update: { name: catName, slug },
            create: { id: newCatId, name: catName, slug },
          });
        } catch {}
      }
    }

    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `product-${id}`;
    if (usedSlugs.has(slug)) {
      slug = `${slug}-${id}`;
    }
    usedSlugs.add(slug);

    const tags = (row["Tags"] || "").split(",").map(t => t.trim()).filter(Boolean);

    // Build Product Object for JSON
    const productObj = {
      id: String(id),
      name,
      slug,
      type,
      status: row["Published"] === "1" ? "active" : "draft",
      description,
      shortDescription: shortDesc,
      sku,
      price,
      salePrice: compareAtPrice,
      mrp: compareAtPrice || price * 1.4,
      costPrice: Math.round(price * 0.4),
      stock,
      categoryId,
      categoryName: rawCats[0] || "General",
      images,
      tags,
      isFeatured,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    jsonProducts.push(productObj);

    // Insert into PostgreSQL
    try {
      await prisma.product.create({
        data: {
          id: String(id),
          name,
          slug,
          description,
          price,
          compareAtPrice,
          costPrice: Math.round(price * 0.4),
          sku: sku ? String(sku) : null,
          stock,
          categoryId,
          status: row["Published"] === "1" ? "active" : "draft",
          isFeatured,
          tags,
          images: {
            create: images.map((url, idx) => ({
              url,
              sortOrder: idx,
            })),
          },
        },
      });
      importedCount++;
    } catch (err: any) {
      console.warn(`DB insert warning for product ${id}:`, err.message);
    }
  }

  // Save JSON stores
  fs.writeFileSync(categoriesPath, JSON.stringify(categoriesData, null, 2), "utf-8");
  const productsPath = path.join(process.cwd(), "data", "products.json");
  fs.writeFileSync(productsPath, JSON.stringify(jsonProducts, null, 2), "utf-8");

  console.log(`🎉 ALL PRODUCTS IMPORTED! Total: ${importedCount} products in Railway PostgreSQL & data/products.json`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
