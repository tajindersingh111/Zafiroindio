"use client";

import { Suspense } from "react";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getStorefrontProducts } from "@/lib/data";
import { SlidersHorizontal, X } from "lucide-react";

function ShopContent() {
  const searchParams = useSearchParams();
  const allProducts = getStorefrontProducts();

  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(3000);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState("featured");

  // Sync URL params (collection, badge)
  useEffect(() => {
    const collection = searchParams.get("collection");
    const badge = searchParams.get("badge");
    if (collection) {
      const catMap: Record<string, string> = {
        floral: "Floral", minimal: "Minimal", printed: "Printed",
        luxury: "Luxury", everyday: "Everyday Comfort", new: "New Arrivals"
      };
      const cat = catMap[collection];
      if (cat) setSelectedCategories([cat]);
    }
    if (badge === "bestseller") setSort("bestseller");
    if (badge === "new") setSort("newest");
  }, [searchParams]);

  const categories = ["Floral", "Minimal", "Printed", "Luxury", "Everyday Comfort", "New Arrivals"];
  const sizes = ["Single", "Double", "Queen", "King"];
  const colorOptions = [
    { name: "Sage Green", hex: "#8aad84" },
    { name: "Indigo Blue", hex: "#3d5a80" },
    { name: "Terracotta", hex: "#c27348" },
    { name: "Ivory", hex: "#f5f0e8" },
    { name: "Blush", hex: "#e8b4b8" },
    { name: "Midnight Blue", hex: "#1a2a4a" },
  ];

  const toggleCat = (cat: string) =>
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  const toggleSize = (s: string) =>
    setSelectedSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  const toggleColor = (c: string) =>
    setSelectedColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const filtered = useMemo(() => {
    let result = [...allProducts];
    if (selectedCategories.length > 0) result = result.filter(p => selectedCategories.includes(p.category));
    if (selectedSizes.length > 0) result = result.filter(p => p.sizes.some(s => selectedSizes.includes(s)));
    if (selectedColors.length > 0) result = result.filter(p => p.colors.some(c => selectedColors.includes(c)));
    result = result.filter(p => p.price <= maxPrice);
    result = result.filter(p => p.rating >= minRating);
    switch (sort) {
      case "newest": result = [...result.filter(p => p.badge === "NEW"), ...result.filter(p => p.badge !== "NEW")]; break;
      case "bestseller": result = [...result.filter(p => p.badge === "BESTSELLER"), ...result.filter(p => p.badge !== "BESTSELLER")]; break;
      case "price-low": result = [...result].sort((a, b) => a.price - b.price); break;
      case "price-high": result = [...result].sort((a, b) => b.price - a.price); break;
      case "rating": result = [...result].sort((a, b) => b.rating - a.rating); break;
    }
    return result;
  }, [allProducts, selectedCategories, selectedSizes, selectedColors, maxPrice, minRating, sort]);

  const hasFilters = selectedCategories.length > 0 || selectedSizes.length > 0 || selectedColors.length > 0 || minRating > 0 || maxPrice < 3000;

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedSizes([]);
    setSelectedColors([]);
    setMaxPrice(3000);
    setMinRating(0);
  };

  return (
    <main>
      <div className="container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link href="/">Home</Link> / <span>Shop</span>
        </div>

        {/* Heading */}
        <div className="shopHead">
          <h1 className="serif">Shop All Bedsheets</h1>
          <p>Timeless designs. Premium comfort.</p>
        </div>

        {/* Sort / Meta bar */}
        <div className="shopMeta">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              Showing {filtered.length} of {allProducts.length} products
            </span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--gold-dark)", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}
              >
                <X size={12} /> Clear filters
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Sort by:</label>
            <select className="sort" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="bestseller">Bestsellers</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>

        {/* Layout */}
        <div className="shopLayout">
          {/* Filter Sidebar */}
          <aside className="filters">
            <div className="filterHeader">
              Filters
              {hasFilters && (
                <button onClick={clearFilters} style={{ fontSize: 10, fontWeight: 600, color: "var(--gold-dark)", background: "none", border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.3, float: "right" }}>
                  Clear All
                </button>
              )}
            </div>

            {/* Category */}
            <div className="filterGroup">
              <div className="filterTitle">Category <span>⌃</span></div>
              {categories.map(cat => (
                <label className="check" key={cat}>
                  <input type="checkbox" checked={selectedCategories.includes(cat)} onChange={() => toggleCat(cat)} />
                  {cat}
                </label>
              ))}
            </div>

            {/* Size */}
            <div className="filterGroup">
              <div className="filterTitle">Size <span>⌃</span></div>
              {sizes.map(s => (
                <label className="check" key={s}>
                  <input type="checkbox" checked={selectedSizes.includes(s)} onChange={() => toggleSize(s)} />
                  {s}
                </label>
              ))}
            </div>

            {/* Color */}
            <div className="filterGroup">
              <div className="filterTitle">Color</div>
              <div className="colorSwatches">
                {colorOptions.map(c => (
                  <button
                    key={c.name}
                    title={c.name}
                    onClick={() => toggleColor(c.name)}
                    className={`colorSwatch${selectedColors.includes(c.name) ? " active" : ""}`}
                    style={{ background: c.hex }}
                    aria-label={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="filterGroup">
              <div className="filterTitle">Price Range</div>
              <input
                type="range" min={499} max={3000} step={100}
                value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--gold-dark)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 6, color: "var(--muted)" }}>
                <span>₹499</span>
                <span style={{ color: "var(--ink)", fontWeight: 700 }}>Up to ₹{maxPrice.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Rating */}
            <div className="filterGroup">
              <div className="filterTitle">Rating</div>
              {[4, 3].map(r => (
                <label className="check" key={r}>
                  <input
                    type="radio" name="rating"
                    checked={minRating === r}
                    onChange={() => setMinRating(minRating === r ? 0 : r)}
                  />
                  {"★".repeat(r)}{"☆".repeat(5 - r)} {r} &amp; above
                </label>
              ))}
            </div>
          </aside>

          {/* Product Grid */}
          <div>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
                <p style={{ fontSize: 15, marginBottom: 16 }}>No products match the selected filters.</p>
                <button onClick={clearFilters} className="btn gold" style={{ fontSize: 11 }}>Clear All Filters</button>
              </div>
            ) : (
              <div className="productGrid">
                {filtered.map(p => (
                  <ProductCard key={p.slug} p={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Shop() {
  return (
    <Suspense fallback={
      <main>
        <div className="container" style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>
          Loading products…
        </div>
      </main>
    }>
      <ShopContent />
    </Suspense>
  );
}
