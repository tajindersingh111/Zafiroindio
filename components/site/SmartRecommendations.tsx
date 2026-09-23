"use client";

/**
 * SmartRecommendations
 * --------------------
 * Reads dwell-time data from localStorage and surfaces the most
 * interesting products for the current user. Shows nothing if no
 * data is available (first visit).
 *
 * Props:
 *  - excludeSlug  : slug of the currently viewed product (don't recommend itself)
 *  - mode         : "interest" (sorted by dwell score) | "recent" (sorted by time)
 *  - title        : section heading
 *  - maxItems     : max cards to show (default 4)
 *  - variant      : "full" (with section header) | "compact" (minimal strip)
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Eye, TrendingUp } from "lucide-react";
import { getRankedRecommendations, getRecentlyViewed, formatDwellTime, type RecommendationResult } from "@/lib/recommendations";
import { getStorefrontProducts, type Product } from "@/lib/data";
import ProductCard from "@/components/ProductCard";

interface Props {
  excludeSlug?: string;
  mode?: "interest" | "recent";
  title?: string;
  subtitle?: string;
  maxItems?: number;
  variant?: "full" | "compact";
}

export default function SmartRecommendations({
  excludeSlug,
  mode = "interest",
  title,
  subtitle,
  maxItems = 4,
  variant = "full",
}: Props) {
  const [recommendations, setRecommendations] = useState<
    (Product & { score: number; totalSeconds: number; viewCount: number })[]
  >([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const excluded = excludeSlug ? [excludeSlug] : [];
    const ranked: RecommendationResult[] =
      mode === "interest"
        ? getRankedRecommendations(excluded, maxItems * 2)
        : getRecentlyViewed(excluded, maxItems * 2);

    if (ranked.length === 0) {
      setLoaded(true);
      return;
    }

    const allProducts = getStorefrontProducts();
    const matched = ranked
      .map((r) => {
        const p = allProducts.find((p) => p.slug === r.slug);
        if (!p) return null;
        return { ...p, score: r.score, totalSeconds: r.totalSeconds, viewCount: r.viewCount };
      })
      .filter(Boolean)
      .slice(0, maxItems) as (Product & { score: number; totalSeconds: number; viewCount: number })[];

    setRecommendations(matched);
    setLoaded(true);
  }, [excludeSlug, mode, maxItems]);

  // Don't render on first visit (no data) or while loading
  if (!loaded || recommendations.length === 0) return null;

  const defaultTitle =
    mode === "interest"
      ? "Picked For You"
      : "Recently Viewed";

  const defaultSubtitle =
    mode === "interest"
      ? "Based on your browsing — you spent the most time with these."
      : "Products you've visited recently.";

  const Icon = mode === "interest" ? TrendingUp : Clock;

  /* ── COMPACT STRIP ─────────────────────────────────────── */
  if (variant === "compact") {
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #eae4d9",
          borderRadius: 10,
          padding: "18px 20px",
          marginTop: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Icon size={15} color="#c5a028" />
          <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#1c1917" }}>
            {title ?? defaultTitle}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {recommendations.map((p) => (
            <Link
              key={p.slug}
              href={`/products/${p.slug}`}
              style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}
            >
              <img
                src={p.images[0]}
                alt={p.name}
                style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 6, flexShrink: 0, border: "1px solid #eae4d9" }}
                onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=200&q=70"; }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1c1917", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#1c1917" }}>
                    ₹{p.price.toLocaleString("en-IN")}
                  </span>
                  {p.totalSeconds > 0 && (
                    <span style={{ fontSize: 10, color: "#a8a09a", display: "flex", alignItems: "center", gap: 3 }}>
                      <Eye size={10} /> {formatDwellTime(p.totalSeconds)} viewed
                    </span>
                  )}
                </div>
              </div>
              <ArrowRight size={13} color="#c5a028" style={{ flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      </div>
    );
  }

  /* ── FULL SECTION ──────────────────────────────────────── */
  return (
    <section
      style={{
        padding: "60px 0 70px",
        background: mode === "interest" ? "#fff" : "#faf8f5",
        borderTop: "1px solid #eae4d9",
      }}
    >
      <div className="container" style={{ maxWidth: 1280 }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 32,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: mode === "interest" ? "#fffbf0" : "#f0f4ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={16} color={mode === "interest" ? "#c5a028" : "#1d4ed8"} />
              </div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: mode === "interest" ? "#a67c37" : "#1d4ed8",
                  margin: 0,
                }}
              >
                {mode === "interest" ? "Personalised For You" : "Your History"}
              </p>
            </div>
            <h2
              className="serif"
              style={{
                fontSize: 28,
                fontWeight: 500,
                color: "#1c1917",
                margin: "0 0 6px",
              }}
            >
              {title ?? defaultTitle}
            </h2>
            <p style={{ fontSize: 13.5, color: "#78716c", margin: 0 }}>
              {subtitle ?? defaultSubtitle}
            </p>
          </div>

          <Link
            href="/shop"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              color: "#a67c37",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Browse All <ArrowRight size={13} />
          </Link>
        </div>

        {/* Product Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(recommendations.length, 4)}, 1fr)`,
            gap: 22,
          }}
        >
          {recommendations.map((p) => (
            <div key={p.slug} style={{ position: "relative" }}>
              {/* Dwell badge */}
              {p.totalSeconds >= 10 && (
                <div
                  style={{
                    position: "absolute",
                    top: -10,
                    left: 10,
                    zIndex: 10,
                    background:
                      mode === "interest"
                        ? "linear-gradient(135deg, #c5a028, #e8c547)"
                        : "linear-gradient(135deg, #1d4ed8, #3b82f6)",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 800,
                    padding: "3px 8px",
                    borderRadius: 20,
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  }}
                >
                  {mode === "interest" ? (
                    <>
                      <TrendingUp size={9} />
                      {formatDwellTime(p.totalSeconds)} viewed
                    </>
                  ) : (
                    <>
                      <Eye size={9} />
                      {p.viewCount}× visited
                    </>
                  )}
                </div>
              )}
              <ProductCard p={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
