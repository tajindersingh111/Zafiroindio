"use client";
import { useState } from "react";
import Link from "next/link";
import { Heart, Sparkles, Check } from "lucide-react";
import { Product } from "@/lib/data";
import { useStore } from "./StoreProvider";

export default function ProductCard({ p }: { p: Product }) {
  const { add, wishlist, toggleWish } = useStore();
  const [selectedSize, setSelectedSize] = useState(p.sizes[0] || "King");
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const wished = wishlist.includes(p.slug);
  const isOutOfStock = p.badge === "OUT OF STOCK";
  const hasSecondImage = p.images && p.images.length > 1;

  const badgeCls =
    p.badge === "NEW"
      ? "bg-amber-600/90 text-white"
      : p.badge === "SALE"
      ? "bg-emerald-700/90 text-white"
      : "bg-[#12192c] text-[#c5a028]";

  const stars = Math.round(p.rating || 5);

  function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    add(p, selectedSize, p.colors[0] || "Standard");
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 1800);
  }

  return (
    <article 
      className="group relative bg-[#fcfbfa] border border-[#e8e2d8] hover:border-[#c5a028]/60 transition-all duration-300 hover:shadow-xl hover:shadow-[#12192c]/5 rounded-sm overflow-hidden flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Image Container */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#f4eee4]">
        <Link href={`/products/${p.slug}`} className="block w-full h-full">
          {/* Primary Image */}
          <img
            src={p.images[0]}
            alt={`${p.name} luxury bedsheet`}
            loading="lazy"
            className={`w-full h-full object-cover object-center transition-all duration-700 ease-out ${
              isHovered && hasSecondImage ? "scale-105 opacity-0" : "scale-100 opacity-100"
            }`}
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85";
            }}
          />

          {/* Secondary Hover Image */}
          {hasSecondImage && (
            <img
              src={p.images[1]}
              alt={`${p.name} lifestyle detail`}
              loading="lazy"
              className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-700 ease-out ${
                isHovered ? "scale-105 opacity-100" : "scale-100 opacity-0"
              }`}
            />
          )}
        </Link>

        {/* Handblock Authentic Gold Foil Stamp Badge */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10 pointer-events-none">
          {p.badge && (
            <span className={`px-2.5 py-0.5 text-[9px] font-mono uppercase tracking-widest font-bold rounded-xs shadow-xs backdrop-blur-xs ${badgeCls}`}>
              {p.badge}
            </span>
          )}
          <span className="px-2 py-0.5 text-[8.5px] font-mono tracking-wider uppercase bg-[#12192c]/85 text-[#c5a028] border border-[#c5a028]/30 rounded-xs backdrop-blur-md flex items-center gap-1 shadow-xs">
            <Sparkles size={10} className="text-[#c5a028]" /> Jaipur Handblock
          </span>
        </div>

        {/* Wishlist Button */}
        <button
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-[#12192c] flex items-center justify-center backdrop-blur-md shadow-xs transition-all duration-200 hover:scale-110 z-10"
          onClick={() => toggleWish(p.slug)}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            size={15}
            className={wished ? "fill-[#c86d51] text-[#c86d51]" : "text-[#12192c] group-hover:text-[#c5a028] transition-colors"}
          />
        </button>

        {/* Quick Add Overlay on Hover */}
        <div className="absolute inset-x-3 bottom-3 z-10 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out">
          {/* Size Select Pill Row */}
          {p.sizes && p.sizes.length > 1 && (
            <div className="flex items-center justify-center gap-1 bg-[#12192c]/90 backdrop-blur-md p-1.5 rounded-t-sm border-t border-x border-[#c5a028]/20 mb-[-1px]">
              {p.sizes.map((s) => (
                <button
                  key={s}
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedSize(s);
                  }}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded-xs transition-all ${
                    selectedSize === s
                      ? "bg-[#c5a028] text-[#12192c] font-bold"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Action Button */}
          <button
            disabled={isOutOfStock}
            onClick={handleQuickAdd}
            className={`w-full py-2.5 px-4 text-xs font-mono uppercase tracking-widest font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
              isOutOfStock
                ? "bg-slate-700 text-slate-300 cursor-not-allowed opacity-80"
                : addedSuccess
                ? "bg-emerald-700 text-white"
                : "bg-[#12192c] hover:bg-[#1a2544] text-[#c5a028] border border-[#c5a028]/40 hover:border-[#c5a028]"
            }`}
          >
            {addedSuccess ? (
              <>
                <Check size={14} /> Added ({selectedSize})
              </>
            ) : isOutOfStock ? (
              "Sold Out"
            ) : (
              `+ Quick Add (${selectedSize})`
            )}
          </button>
        </div>
      </div>

      {/* Card Metadata */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-[9.5px] font-mono uppercase tracking-widest text-[#c5a028] font-bold block mb-1">
            {p.fabric || "100% Pure Cotton"}
          </span>
          <Link 
            href={`/products/${p.slug}`} 
            className="text-sm font-serif font-bold text-[#12192c] hover:text-[#c5a028] transition-colors line-clamp-1 block mb-2"
          >
            {p.name}
          </Link>
        </div>

        <div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-base font-bold text-[#12192c]">
              ₹{p.price.toLocaleString("en-IN")}
            </span>
            {p.oldPrice > p.price && (
              <>
                <span className="text-xs text-slate-400 line-through">
                  ₹{p.oldPrice.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-xs">
                  {p.discount}% OFF
                </span>
              </>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-[#e8e2d8]/60">
            <div className="flex items-center gap-1 text-[#c5a028]">
              {"★".repeat(stars)}
              <span className="text-[11px] text-slate-500 font-mono ml-1">({p.reviews})</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 uppercase">
              Jaipur Craft
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

