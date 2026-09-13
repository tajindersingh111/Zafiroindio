import { NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";
import { products as fallbackProducts, Product } from "@/lib/data";

export async function GET() {
  try {
    const dbProducts = readCollection<any>("products");
    
    if (dbProducts && dbProducts.length > 0) {
      const activeProducts = dbProducts.filter((p) => p.status !== "inactive" && p.status !== "draft");
      
      const mapped: Product[] = activeProducts.map((p) => {
        const defaultImage = "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85";
        const images = Array.isArray(p.images) && p.images.length > 0 
          ? p.images.map((img: any) => typeof img === "string" ? img : img.url || defaultImage)
          : [defaultImage];
          
        const price = Number(p.price) || 1299;
        const oldPrice = Number(p.mrp) || Number(p.oldPrice) || Math.round(price * 1.4);
        const discount = oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
        
        let badge: string | undefined = undefined;
        if (p.stock <= 0) {
          badge = "OUT OF STOCK";
        } else if (p.tags && p.tags.includes("bestseller")) {
          badge = "BESTSELLER";
        } else if (p.tags && p.tags.includes("new")) {
          badge = "NEW";
        }

        return {
          slug: p.slug || p.id,
          name: p.name,
          price: price,
          oldPrice: oldPrice,
          discount: discount,
          rating: p.rating || 4.8,
          reviews: p.reviews || 24,
          badge: badge,
          fabric: p.fabric || "100% Cotton",
          category: p.category || "Printed",
          colors: p.attributes?.Color || ["Sage Green", "Indigo Blue"],
          sizes: p.attributes?.Size || ["Single", "Double", "Queen", "King"],
          description: p.description || p.shortDescription || "",
          images: images
        };
      });

      return NextResponse.json({ products: mapped, source: "database" });
    }

    return NextResponse.json({ products: fallbackProducts, source: "fallback" });
  } catch (error) {
    return NextResponse.json({ products: fallbackProducts, source: "fallback_error" });
  }
}
