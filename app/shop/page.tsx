"use client";

import { Suspense, useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getStorefrontProducts } from "@/lib/data";
import { ChevronDown, ChevronUp, LayoutGrid, Grid, Check, Heart } from "lucide-react";

function ShopContent() {
  const searchParams = useSearchParams();
  const allProducts = getStorefrontProducts();

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>("All Bedsheets");
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(2499);
  const [minRating, setMinRating] = useState<number>(0);
  const [sort, setSort] = useState<string>("featured");
  const [viewMode, setViewMode] = useState<"grid4" | "grid3">("grid4");

  // Accordion state
  const [openSections, setOpenSections] = useState({
    category: true,
    size: true,
    color: true,
    price: true,
    rating: true,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Sync URL query params (collection, badge)
  useEffect(() => {
    const collection = searchParams.get("collection");
    const badge = searchParams.get("badge");
    if (collection) {
      const catMap: Record<string, string> = {
        floral: "Floral",
        minimal: "Minimal",
        printed: "Printed",
        luxury: "Luxury",
        everyday: "Everyday Comfort",
        new: "New Arrivals",
      };
      if (catMap[collection]) {
        setSelectedCategory(catMap[collection]);
      }
    }
    if (badge === "bestseller") setSort("bestseller");
    if (badge === "new") setSort("newest");
  }, [searchParams]);

  // Available Filter Lists (Calculated Dynamically from Products)
  const categoriesList = useMemo(() => {
    const cats = Array.from(new Set(allProducts.map((p) => p.category))).filter(Boolean);
    return ["All Bedsheets", ...cats];
  }, [allProducts]);

  const sizesList = ["Single", "Double", "Queen", "King"];

  const colorSwatches = [
    { name: "Ivory", hex: "#ffffff", border: true },
    { name: "Beige", hex: "#d4b896" },
    { name: "Sage Green", hex: "#1b6b68" },
    { name: "Blush", hex: "#f4a6b2" },
    { name: "Terracotta", hex: "#701c34" },
    { name: "Grey", hex: "#a8a8a8" },
    { name: "Indigo Blue", hex: "#3d3d3d" },
  ];

  const toggleSize = (s: string) => {
    setSelectedSizes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const toggleColor = (c: string) => {
    setSelectedColors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  // Filtered Products Logic
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // Category Filter
    if (selectedCategory && selectedCategory !== "All Bedsheets") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Size Filter
    if (selectedSizes.length > 0) {
      result = result.filter((p) =>
        p.sizes.some((s) => selectedSizes.includes(s))
      );
    }

    // Color Filter
    if (selectedColors.length > 0) {
      result = result.filter((p) =>
        p.colors.some((c) => selectedColors.includes(c))
      );
    }

    // Price Filter
    result = result.filter((p) => p.price <= maxPrice);

    // Rating Filter
    if (minRating > 0) {
      result = result.filter((p) => p.rating >= minRating);
    }

    // Sorting
    switch (sort) {
      case "newest":
        result = [...result.filter((p) => p.badge === "NEW"), ...result.filter((p) => p.badge !== "NEW")];
        break;
      case "bestseller":
        result = [...result.filter((p) => p.badge === "BESTSELLER"), ...result.filter((p) => p.badge !== "BESTSELLER")];
        break;
      case "price-low":
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        result = [...result].sort((a, b) => b.rating - a.rating);
        break;
    }

    return result;
  }, [allProducts, selectedCategory, selectedSizes, selectedColors, maxPrice, minRating, sort]);

  const hasFilters =
    selectedCategory !== "All Bedsheets" ||
    selectedSizes.length > 0 ||
    selectedColors.length > 0 ||
    minRating > 0 ||
    maxPrice < 2499;

  const clearFilters = () => {
    setSelectedCategory("All Bedsheets");
    setSelectedSizes([]);
    setSelectedColors([]);
    setMaxPrice(2499);
    setMinRating(0);
  };

  return (
    <main style={{ background: "#faf8f5", minHeight: "100vh", paddingBottom: 80 }}>
      <div className="container" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px" }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: 12, color: "#888", padding: "20px 0 14px", display: "flex", gap: 6 }}>
          <Link href="/" style={{ color: "#888", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "#333", fontWeight: 500 }}>Shop</span>
        </nav>

        {/* Page Title & Subtitle */}
        <div style={{ marginBottom: 28 }}>
          <h1
            className="serif"
            style={{
              fontSize: 34,
              fontWeight: 600,
              color: "#1c1917",
              letterSpacing: "-0.5px",
              margin: "0 0 6px"
            }}
          >
            SHOP ALL BEDSHEETS
          </h1>
          <p style={{ fontSize: 14, color: "#66625d", margin: 0 }}>
            Timeless designs. Premium comfort.
          </p>
        </div>

        {/* Toolbar Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 20,
            marginBottom: 24,
            borderBottom: "1px solid #e7e1d6"
          }}
        >
          <div style={{ fontSize: 13, color: "#666" }}>
            Showing 1–{filteredProducts.length} of {allProducts.length} products
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Sort Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 12, color: "#666", fontWeight: 500 }}>Sort by:</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                style={{
                  border: "1px solid #d4cdbf",
                  background: "#ffffff",
                  borderRadius: 4,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#1c1917",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="bestseller">Bestsellers</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>

            {/* View Mode Buttons */}
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                onClick={() => setViewMode("grid4")}
                style={{
                  border: "1px solid #d4cdbf",
                  background: viewMode === "grid4" ? "#1c1917" : "#ffffff",
                  color: viewMode === "grid4" ? "#ffffff" : "#666",
                  padding: "6px 8px",
                  borderRadius: 4,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
                aria-label="4 columns view"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid3")}
                style={{
                  border: "1px solid #d4cdbf",
                  background: viewMode === "grid3" ? "#1c1917" : "#ffffff",
                  color: viewMode === "grid3" ? "#ffffff" : "#666",
                  padding: "6px 8px",
                  borderRadius: 4,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
                aria-label="3 columns view"
              >
                <Grid size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Shop Main Layout: Sidebar Filters + Products Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 36 }}>
          {/* Left Filter Sidebar */}
          <aside>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 12,
                borderBottom: "1.5px solid #1c1917",
                marginBottom: 20
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "#1c1917" }}>
                FILTERS
              </span>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  style={{
                    border: 0,
                    background: "none",
                    color: "#a67c37",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Accordion 1: CATEGORY */}
            <div style={{ borderBottom: "1px solid #e7e1d6", paddingBottom: 16, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => toggleSection("category")}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: 0,
                  background: "none",
                  padding: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  color: "#1c1917",
                  cursor: "pointer",
                  marginBottom: openSections.category ? 12 : 0
                }}
              >
                <span>CATEGORY</span>
                {openSections.category ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {openSections.category && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {categoriesList.map((cat) => (
                    <label
                      key={cat}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 13,
                        color: selectedCategory === cat ? "#1c1917" : "#555",
                        fontWeight: selectedCategory === cat ? 600 : 400,
                        cursor: "pointer"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategory === cat}
                        onChange={() => setSelectedCategory(selectedCategory === cat ? "All Bedsheets" : cat)}
                        style={{ accentColor: "#a67c37", width: 15, height: 15, cursor: "pointer" }}
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Accordion 2: SIZE */}
            <div style={{ borderBottom: "1px solid #e7e1d6", paddingBottom: 16, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => toggleSection("size")}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: 0,
                  background: "none",
                  padding: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  color: "#1c1917",
                  cursor: "pointer",
                  marginBottom: openSections.size ? 12 : 0
                }}
              >
                <span>SIZE</span>
                {openSections.size ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {openSections.size && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {sizesList.map((s) => (
                    <label
                      key={s}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 13,
                        color: selectedSizes.includes(s) ? "#1c1917" : "#555",
                        fontWeight: selectedSizes.includes(s) ? 600 : 400,
                        cursor: "pointer"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSizes.includes(s)}
                        onChange={() => toggleSize(s)}
                        style={{ accentColor: "#a67c37", width: 15, height: 15, cursor: "pointer" }}
                      />
                      {s}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Accordion 3: COLOR */}
            <div style={{ borderBottom: "1px solid #e7e1d6", paddingBottom: 16, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => toggleSection("color")}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: 0,
                  background: "none",
                  padding: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  color: "#1c1917",
                  cursor: "pointer",
                  marginBottom: openSections.color ? 12 : 0
                }}
              >
                <span>COLOR</span>
                {openSections.color ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {openSections.color && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {colorSwatches.map((c) => {
                    const isSelected = selectedColors.includes(c.name);
                    return (
                      <button
                        key={c.name}
                        type="button"
                        title={c.name}
                        onClick={() => toggleColor(c.name)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: c.hex,
                          border: isSelected
                            ? "2px solid #a67c37"
                            : c.border
                            ? "1px solid #ccc"
                            : "1px solid rgba(0,0,0,0.1)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: isSelected ? "0 0 0 2px #ffffff, 0 0 0 3px #a67c37" : "none",
                          transition: "all 0.15s ease"
                        }}
                      >
                        {isSelected && <Check size={12} color={c.name === "Ivory" ? "#1c1917" : "#ffffff"} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Accordion 4: PRICE */}
            <div style={{ borderBottom: "1px solid #e7e1d6", paddingBottom: 16, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => toggleSection("price")}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: 0,
                  background: "none",
                  padding: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  color: "#1c1917",
                  cursor: "pointer",
                  marginBottom: openSections.price ? 12 : 0
                }}
              >
                <span>PRICE</span>
                {openSections.price ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {openSections.price && (
                <div>
                  <input
                    type="range"
                    min={499}
                    max={2499}
                    step={100}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    style={{
                      width: "100%",
                      accentColor: "#a67c37",
                      cursor: "pointer"
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 8, color: "#666" }}>
                    <span>₹ 499</span>
                    <span style={{ color: "#1c1917", fontWeight: 700 }}>₹ {maxPrice.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 5: RATING */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("rating")}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: 0,
                  background: "none",
                  padding: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  color: "#1c1917",
                  cursor: "pointer",
                  marginBottom: openSections.rating ? 12 : 0
                }}
              >
                <span>RATING</span>
                {openSections.rating ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {openSections.rating && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { stars: 5, label: "5 Stars", count: 24 },
                    { stars: 4, label: "& above", count: 36 },
                    { stars: 3, label: "& above", count: 42 },
                    { stars: 2, label: "& above", count: 45 }
                  ].map((item) => (
                    <label
                      key={item.stars}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12,
                        color: "#555",
                        cursor: "pointer"
                      }}
                    >
                      <input
                        type="radio"
                        name="ratingFilter"
                        checked={minRating === item.stars}
                        onChange={() => setMinRating(minRating === item.stars ? 0 : item.stars)}
                        style={{ accentColor: "#a67c37", cursor: "pointer" }}
                      />
                      <span style={{ color: "#c5a028", fontSize: 13 }}>
                        {"★".repeat(item.stars)}{"☆".repeat(5 - item.stars)}
                      </span>
                      <span>{item.stars === 5 ? "" : item.label}</span>
                      <span style={{ color: "#999", fontSize: 11 }}>({item.count})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Right Product Grid Area */}
          <div>
            {filteredProducts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#666" }}>
                <p style={{ fontSize: 15, marginBottom: 16 }}>No products match the selected filters.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  style={{
                    background: "#a67c37",
                    color: "#ffffff",
                    border: 0,
                    padding: "10px 20px",
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 4,
                    cursor: "pointer",
                    textTransform: "uppercase"
                  }}
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: viewMode === "grid4" ? "repeat(4, 1fr)" : "repeat(3, 1fr)",
                  gap: 22
                }}
              >
                {filteredProducts.map((p) => (
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
    <Suspense
      fallback={
        <main style={{ background: "#faf8f5", minHeight: "100vh", padding: "60px 0", textAlign: "center", color: "#888" }}>
          Loading products…
        </main>
      }
    >
      <ShopContent />
    </Suspense>
  );
}
