"use client";

import { useSearchParams, useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { products } from "@/lib/data";
import { Suspense, useState, useEffect } from "react";
import { Search as SearchIcon, Sparkles } from "lucide-react";

const POPULAR_TAGS = [
  "Floral",
  "Sage Green",
  "Indigo",
  "Cotton Percale",
  "Jaipuri Block",
  "King Size",
  "Bestsellers"
];

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const rawQ = params.get("q") || "";
  const q = rawQ.toLowerCase().trim();

  const [inputVal, setInputVal] = useState(rawQ);

  useEffect(() => {
    setInputVal(rawQ);
  }, [rawQ]);

  const found = q
    ? products.filter(p =>
        `${p.name} ${p.category} ${p.colors.join(" ")} ${p.description || ""}`.toLowerCase().includes(q)
      )
    : products;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      router.push(`/search?q=${encodeURIComponent(inputVal.trim())}`);
    } else {
      router.push(`/search`);
    }
  };

  return (
    <main>
      <div className="container section">
        <div className="breadcrumb">Home / Search</div>
        <h1 className="serif" style={{ textAlign: "center", marginBottom: 20 }}>Search Zafiro</h1>

        <form onSubmit={handleSubmit} className="searchBox" style={{ maxWidth: 540, margin: "0 auto 20px" }}>
          <input
            name="q"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Search bedsheets, colors, collections..."
            autoFocus
          />
          <button type="submit" className="btn dark" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <SearchIcon size={16} /> Search
          </button>
        </form>

        {/* Popular Search Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 30 }}>
          <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <Sparkles size={13} style={{ color: "var(--gold-dark)" }} /> Popular Searches:
          </span>
          {POPULAR_TAGS.map(tag => {
            const isActive = q === tag.toLowerCase();
            return (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setInputVal(tag);
                  router.push(`/search?q=${encodeURIComponent(tag)}`);
                }}
                style={{
                  border: "1px solid var(--line)",
                  background: isActive ? "var(--ink)" : "#fff",
                  color: isActive ? "#fff" : "var(--ink)",
                  padding: "5px 14px",
                  fontSize: 11.5,
                  borderRadius: 20,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>

        {q ? (
          <p style={{ color: "var(--muted)", textAlign: "center", marginBottom: 24, fontSize: 14 }}>
            Showing <strong>{found.length}</strong> result{found.length === 1 ? "" : "s"} for “<strong>{rawQ}</strong>”
          </p>
        ) : (
          <p style={{ color: "var(--muted)", textAlign: "center", marginBottom: 24, fontSize: 14 }}>
            Showing all <strong>{products.length}</strong> luxury bedsheet collections
          </p>
        )}

        {found.length > 0 ? (
          <div className="productGrid" style={{ marginTop: 10 }}>
            {found.map(p => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </div>
        ) : (
          <div className="empty" style={{ textAlign: "center", padding: "40px 0" }}>
            <h2 className="serif" style={{ marginBottom: 10 }}>No exact matches found for "{rawQ}"</h2>
            <p style={{ color: "var(--muted)", marginBottom: 20 }}>Try searching for "floral", "blue", "jaipuri" or select a tag above.</p>
            <button
              className="btn gold"
              onClick={() => {
                setInputVal("");
                router.push("/search");
              }}
            >
              View All Products
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function Search() {
  return (
    <Suspense fallback={<div className="empty">Loading search…</div>}>
      <SearchInner />
    </Suspense>
  );
}
