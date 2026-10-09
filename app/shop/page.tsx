"use client";

import { Suspense, useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { useCatalog } from "@/lib/storefront/useCatalog";
import { ChevronDown, ChevronUp, LayoutGrid, Grid, Check, SlidersHorizontal, X } from "lucide-react";

function ShopContent() {
  const searchParams = useSearchParams();
  const { products: allProducts, loading: catalogLoading } = useCatalog();

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>(""); // category or collection slug; "" = everything
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number | null>(null); // null = no price limit
  const [minRating, setMinRating] = useState<number>(0);
  const [sort, setSort] = useState<string>("featured");
  const [viewMode, setViewMode] = useState<"grid4" | "grid3">("grid4");
  const [filtersOpen, setFiltersOpen] = useState(false); // phone filter drawer

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

  // Sync URL query params (?collection=<category or collection slug>, ?badge=)
  useEffect(() => {
    const collection = searchParams.get("collection") || searchParams.get("category");
    const badge = searchParams.get("badge");
    setSelectedCategory(collection ?? "");
    if (badge === "bestseller") setSort("bestseller");
    if (badge === "new") setSort("newest");
  }, [searchParams]);

  // Filter options come from the catalogue itself, so a filter can never lead to an empty page.
  const categoriesList = useMemo(() => {
    const m = new Map<string, { slug: string; name: string; count: number }>();
    for (const p of allProducts) {
      if (!p.categorySlug) continue;
      const c = m.get(p.categorySlug) ?? { slug: p.categorySlug, name: p.categoryName || p.categorySlug, count: 0 };
      c.count += 1;
      m.set(p.categorySlug, c);
    }
    return Array.from(m.values()).sort((a, b) => b.count - a.count);
  }, [allProducts]);

  const sizesList = useMemo(() => Array.from(new Set(allProducts.flatMap((p) => p.sizes || []))), [allProducts]);

  const SWATCH: Record<string, string> = { ivory: "#ffffff", white: "#ffffff", beige: "#d4b896", "sage green": "#1b6b68", green: "#4a7c59", blush: "#f4a6b2", pink: "#f4a6b2", terracotta: "#b5543b", grey: "#a8a8a8", gray: "#a8a8a8", "indigo blue": "#2e3a6e", blue: "#2e5aa8", indigo: "#2e3a6e", yellow: "#e7c13b", red: "#b23a3a", black: "#1c1917" };
  const colorSwatches = useMemo(
    () => Array.from(new Set(allProducts.flatMap((p) => p.colors || []))).map((name) => ({ name, hex: SWATCH[name.toLowerCase()] ?? "#cbbfa9", border: /ivory|white/i.test(name) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allProducts]
  );

  const priceCeil = useMemo(() => Math.max(500, Math.ceil(Math.max(0, ...allProducts.map((p) => p.price || 0)) / 100) * 100), [allProducts]);
  const priceFloor = useMemo(() => (allProducts.length ? Math.floor(Math.min(...allProducts.map((p) => p.price || 0)) / 100) * 100 : 0), [allProducts]);
  const ratingCounts = useMemo(() => [5, 4, 3, 2].map((stars) => ({ stars, count: allProducts.filter((p) => (p.rating || 0) >= stars).length })), [allProducts]);
  const hasRatings = ratingCounts.some((r) => r.count > 0);

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
    if (selectedCategory) {
      result = result.filter((p) => p.categorySlug === selectedCategory || p.category === selectedCategory || p.collections?.includes(selectedCategory));
    }

    // Size Filter
    if (selectedSizes.length > 0) {
      result = result.filter((p) =>
        (Array.isArray(p.sizes) ? p.sizes : []).some((s) => selectedSizes.includes(s))
      );
    }

    // Color Filter
    if (selectedColors.length > 0) {
      result = result.filter((p) =>
        (Array.isArray(p.colors) ? p.colors : []).some((c) => selectedColors.includes(c))
      );
    }

    // Price Filter
    if (maxPrice !== null) result = result.filter((p) => (p.price || 0) <= maxPrice);

    // Rating Filter
    if (minRating > 0) {
      result = result.filter((p) => (p.rating || 0) >= minRating);
    }

    // Sorting
    switch (sort) {
      case "newest":
        // Tagged "new" first, then most recently added.
        result = [...result].sort((a, b) => Number(b.badge === "NEW") - Number(a.badge === "NEW") || (b.createdAt || "").localeCompare(a.createdAt || ""));
        break;
      case "bestseller":
        // Real units sold; admin "bestseller" tags count as a tie-breaker boost.
        result = [...result].sort((a, b) => (b.popularity || 0) - (a.popularity || 0) || Number(b.badge === "BESTSELLER") - Number(a.badge === "BESTSELLER"));
        break;
      case "price-low":
        result = [...result].sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case "price-high":
        result = [...result].sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case "rating":
        result = [...result].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
    }

    return result;
  }, [allProducts, selectedCategory, selectedSizes, selectedColors, maxPrice, minRating, sort]);

  const hasFilters =
    !!selectedCategory ||
    selectedSizes.length > 0 ||
    selectedColors.length > 0 ||
    minRating > 0 ||
    maxPrice !== null;

  const clearFilters = () => {
    setSelectedCategory("");
    setSelectedSizes([]);
    setSelectedColors([]);
    setMaxPrice(null);
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
            SHOP ALL
          </h1>
          <p style={{ fontSize: 14, color: "#66625d", margin: 0 }}>
            Timeless designs. Premium comfort.
          </p>
        </div>

        {/* Toolbar Bar */}
        <div className="shop-toolbar">
          <button type="button" className="shop-filter-toggle" onClick={() => setFiltersOpen(true)} aria-expanded={filtersOpen} aria-controls="shop-filters">
            <SlidersHorizontal size={15} /> Filters{hasFilters ? " •" : ""}
          </button>
          <div className="shop-count">
            {catalogLoading ? "Loading products…" : `${filteredProducts.length} of ${allProducts.length} products`}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Sort Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label htmlFor="shop-sort" className="shop-sort-label">Sort by:</label>
              <select
                id="shop-sort"
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
            <div className="shop-viewmode">
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
        <div className="shop-layout">
          {filtersOpen && <div className="shop-filters-backdrop" onClick={() => setFiltersOpen(false)} />}
          {/* Left Filter Sidebar (a bottom drawer on phones) */}
          <aside id="shop-filters" className={`shop-filters${filtersOpen ? " open" : ""}`} aria-label="Filters">
            <div className="shop-filters-head">
              <strong>Filters</strong>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X size={20} /></button>
            </div>
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
                  {[{ slug: "", name: "All products", count: allProducts.length }, ...categoriesList].map((cat) => (
                    <label
                      key={cat.slug || "all"}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 13,
                        color: selectedCategory === cat.slug ? "#1c1917" : "#555",
                        fontWeight: selectedCategory === cat.slug ? 600 : 400,
                        cursor: "pointer"
                      }}
                    >
                      <input
                        type="radio"
                        name="categoryFilter"
                        checked={selectedCategory === cat.slug}
                        onChange={() => setSelectedCategory(cat.slug)}
                        style={{ accentColor: "#a67c37", width: 15, height: 15, cursor: "pointer" }}
                      />
                      <span style={{ flex: 1 }}>{cat.name}</span>
                      <span style={{ color: "#999", fontSize: 11 }}>{cat.count}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Accordion 2: SIZE (only when products have sizes) */}
            {sizesList.length > 0 && <div style={{ borderBottom: "1px solid #e7e1d6", paddingBottom: 16, marginBottom: 16 }}>
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
            </div>}

            {/* Accordion 3: COLOR (only when products have colours) */}
            {colorSwatches.length > 0 && <div style={{ borderBottom: "1px solid #e7e1d6", paddingBottom: 16, marginBottom: 16 }}>
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
            </div>}

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
                    aria-label="Maximum price"
                    min={priceFloor}
                    max={priceCeil}
                    step={100}
                    value={maxPrice ?? priceCeil}
                    onChange={(e) => setMaxPrice(Number(e.target.value) >= priceCeil ? null : Number(e.target.value))}
                    style={{
                      width: "100%",
                      accentColor: "#a67c37",
                      cursor: "pointer"
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 8, color: "#666" }}>
                    <span>₹ {priceFloor.toLocaleString("en-IN")}</span>
                    <span style={{ color: "#1c1917", fontWeight: 700 }}>{maxPrice === null ? "Any price" : `Up to ₹ ${maxPrice.toLocaleString("en-IN")}`}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 5: RATING (only once products have reviews) */}
            {hasRatings && <div>
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
                  {ratingCounts.map((item) => ({ ...item, label: "& above" })).map((item) => (
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
            </div>}
            <button type="button" className="btn gold full shop-filters-apply" onClick={() => setFiltersOpen(false)}>
              Show {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
            </button>
          </aside>

          {/* Right Product Grid Area */}
          <div style={{ minWidth: 0 }}>
            {catalogLoading ? (
              <div className={`shop-grid ${viewMode}`} aria-busy="true">
                {Array.from({ length: 8 }, (_, i) => <div key={i} className="shop-skeleton" />)}
              </div>
            ) : filteredProducts.length === 0 ? (
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
              <div className={`shop-grid ${viewMode}`}>
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
