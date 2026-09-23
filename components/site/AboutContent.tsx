"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Leaf,
  ShieldCheck,
  Award,
  Star,
  Quote,
  Gem,
  HandHeart,
  Sprout,
  Flame,
  Globe,
  CheckCircle2,
  Heart,
  Sparkles,
  Feather,
  Package,
} from "lucide-react";

/* ─────────────────────────────────────────────
   INTERSECTION OBSERVER HOOK
───────────────────────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─────────────────────────────────────────────
   ANIMATED COUNTER
───────────────────────────────────────────── */
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useReveal(0.3);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const duration = 1800;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [visible, target]);
  return <span ref={ref}>{count.toLocaleString("en-IN")}{suffix}</span>;
}

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const marqueeItems = [
  "100% Pure Cotton",
  "Hand Block Printed",
  "Jaipur Artisans",
  "AZO-Free Dyes",
  "500 Year Old Craft",
  "Free Shipping ₹999+",
  "7-Day Easy Returns",
  "12,000+ Happy Homes",
  "Fair Trade Certified",
  "Made in Rajasthan",
];

const stats = [
  { value: 5, suffix: "+", label: "Years of Craft", sub: "Est. 2020" },
  { value: 172, suffix: "+", label: "Unique Designs", sub: "Hand-crafted" },
  { value: 12000, suffix: "+", label: "Happy Customers", sub: "Across India" },
  { value: 40, suffix: "+", label: "Artisan Partners", sub: "In Jaipur" },
];

const timeline = [
  {
    year: "2019",
    title: "The Idea",
    desc: "Aryan Kapoor returns to Jaipur after 3 years in Mumbai's corporate textile world. He visits the block-printing workshops of Sanganer and sees a dying craft that the world doesn't know about.",
    icon: "💡",
  },
  {
    year: "2020",
    title: "Zafiro is Born",
    desc: "January 2020. A 200 sq ft studio in Sanganer. 6 designs. One Karigar family. Aryan packs every order himself. Then the pandemic hits — but online orders keep coming.",
    icon: "🌱",
  },
  {
    year: "2021",
    title: "Growing the Family",
    desc: "Word-of-mouth explodes. Zafiro onboards 12 new artisan partners. The team grows to 6 people. First 1,000 orders shipped.",
    icon: "🤝",
  },
  {
    year: "2022",
    title: "40+ Artisan Partners",
    desc: "Zafiro launches the Fair Karigar Initiative — guaranteeing above-market pay, safe working conditions, and advance payments to all artisan partners.",
    icon: "⭐",
  },
  {
    year: "2023",
    title: "12,000+ Homes",
    desc: "Zafiro crosses 12,000 orders. Pan-India delivery. New collections: Luxury, Everyday Comfort, and Limited Edition Festive ranges.",
    icon: "🏠",
  },
  {
    year: "2024",
    title: "What's Next",
    desc: "A new children's bedding line, artisan story QR codes on every product, and a Lookbook editorial featuring real Zafiro homes across India.",
    icon: "🚀",
  },
];

const craftSteps = [
  { step: "01", title: "Cotton Sourcing", desc: "Long-staple cotton from organic Gujarat farms — the foundation of a bedsheet that softens with every wash.", icon: Sprout, color: "#2d6a4f", bg: "#f0faf5" },
  { step: "02", title: "Block Carving", desc: "Master carvers in Sanganer hand-sculpt teak wood blocks — 3 to 5 days per block, thousands of prints per block.", icon: Flame, color: "#c2410c", bg: "#fff7f0" },
  { step: "03", title: "Hand-Block Printing", desc: "Karigars stamp each block by hand — eye, feel, and muscle memory honed over decades. 50–100 impressions per bedsheet.", icon: HandHeart, color: "#9b2335", bg: "#fff5f6" },
  { step: "04", title: "Sun Drying", desc: "Fabric dried under Jaipur's golden sun — the heat and light set colour naturally, just as it's been done for 500 years.", icon: Sparkles, color: "#b5860d", bg: "#fffbf0" },
  { step: "05", title: "Quality Check", desc: "Every bedsheet tested for weave density, print alignment, colour fastness, shrinkage, and dimensional accuracy.", icon: ShieldCheck, color: "#1d4ed8", bg: "#f0f4ff" },
  { step: "06", title: "Packed & Dispatched", desc: "Wrapped in recycled kraft paper. Shipped directly from our Jaipur studio — zero middlemen, full transparency.", icon: Package, color: "#6d28d9", bg: "#f5f0ff" },
];

const values = [
  { Icon: Sprout, color: "#2d6a4f", bg: "#f0faf5", title: "Sustainable by Design", desc: "AZO-free dyes. Natural long-staple cotton. Zero synthetic fibres. Every choice made with the planet — and your skin — in mind." },
  { Icon: HandHeart, color: "#9b2335", bg: "#fff5f6", title: "12 Pairs of Hands", desc: "From cotton weaving to block carving, printing, sun-drying, washing, and checking — each bedsheet passes through at least 12 artisans." },
  { Icon: Award, color: "#b5860d", bg: "#fffbf0", title: "Fair Trade Always", desc: "30% above market rate for Karigars. Timely payments. Safe spaces. No shortcuts — because beautiful textiles come from dignified work." },
  { Icon: ShieldCheck, color: "#1d4ed8", bg: "#f0f4ff", title: "Quality You Can Feel", desc: "Every bedsheet tested for weave density, print alignment, colour fastness, and dimensional accuracy. If it doesn't pass, it doesn't ship." },
  { Icon: Globe, color: "#6d28d9", bg: "#f5f0ff", title: "India to Every Bedroom", desc: "Delivery across all 700+ districts. Free shipping above ₹999. No retail markup — direct from Jaipur studio to your doorstep." },
  { Icon: Flame, color: "#c2410c", bg: "#fff7f0", title: "Archiving Heritage", desc: "Block printing is 500+ years old. We're not just selling bedsheets — we're preserving a living art form for the generations to come." },
];

const reviews = [
  { text: "The block prints are absolutely stunning and the cotton is impossibly soft. I've been sleeping better since I got my Zafiro bedsheet.", name: "Priya S.", city: "Mumbai", rating: 5 },
  { text: "Finally a brand honest about where their products come from. The Botanical Bloom is gorgeous — knowing real Jaipur artisans made it makes it even better.", name: "Arjun M.", city: "Bengaluru", rating: 5 },
  { text: "Bought as a housewarming gift and the recipient was absolutely floored by the quality and packaging. Ordering for myself next!", name: "Kavya R.", city: "Delhi", rating: 5 },
];

/* ─────────────────────────────────────────────
   REVEAL WRAPPER
───────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function AboutContent() {
  return (
    <main style={{ background: "#faf8f5", minHeight: "100vh", overflowX: "hidden" }}>

      {/* ══════════════════════════════════════
          1. CINEMATIC HERO
      ══════════════════════════════════════ */}
      <section
        style={{
          position: "relative",
          minHeight: 580,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          background: "linear-gradient(135deg, #0b0907 0%, #1a1208 50%, #231808 100%)",
        }}
      >
        {/* Animated dot grid */}
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(197,160,40,0.2) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
            animation: "subtleFloat 8s ease-in-out infinite alternate",
          }}
        />
        {/* Warm radial glow */}
        <div aria-hidden style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 800, height: 600, background: "radial-gradient(ellipse, rgba(197,160,40,0.1) 0%, transparent 65%)", pointerEvents: "none" }} />

        <div className="container" style={{ maxWidth: 820, textAlign: "center", padding: "110px 20px 100px", position: "relative" }}>
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 36, display: "flex", gap: 8, justifyContent: "center" }}>
            <Link href="/" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none", transition: "color 0.2s" }}>Home</Link>
            <span style={{ opacity: 0.35 }}>/</span>
            <span style={{ color: "rgba(255,255,255,0.6)" }}>Our Story</span>
          </nav>

          {/* Ornamental gems */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 22 }}>
            <div style={{ height: 1, width: 48, background: "linear-gradient(to right, transparent, #c5a028)" }} />
            <Gem size={15} color="#c5a028" />
            <div style={{ height: 1, width: 48, background: "linear-gradient(to left, transparent, #c5a028)" }} />
          </div>

          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "3.5px", textTransform: "uppercase", color: "#c5a028", marginBottom: 20 }}>
            Jaipur · Rajasthan · Est. 2020
          </p>

          <h1
            className="serif"
            style={{
              fontSize: "clamp(34px, 5.5vw, 58px)",
              fontWeight: 500,
              color: "#f5ede0",
              margin: "0 0 24px",
              lineHeight: 1.13,
              letterSpacing: "-0.5px",
              animation: "heroFadeUp 0.9s ease forwards",
            }}
          >
            Where Five Centuries of Craft<br />Meet the Modern Bedroom
          </h1>
          <p style={{ fontSize: 16.5, color: "rgba(245,237,224,0.6)", lineHeight: 1.85, maxWidth: 620, margin: "0 auto 40px", animation: "heroFadeUp 0.9s ease 0.2s both" }}>
            Zafiro Indio partners directly with traditional block-print Karigars of Jaipur to bring 500-year-old Rajasthani craftsmanship — unchanged, uncompromised — into bedrooms across modern India.
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", animation: "heroFadeUp 0.9s ease 0.4s both" }}>
            <Link href="/shop" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #c5a028, #e8c547)", color: "#1c1917", padding: "13px 28px", fontSize: 12, fontWeight: 800, letterSpacing: "0.8px", textTransform: "uppercase", borderRadius: 4, textDecoration: "none", boxShadow: "0 6px 28px rgba(197,160,40,0.4)", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}>
              Shop Our Craft <ArrowRight size={14} />
            </Link>
            <a href="#story" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", color: "#f5ede0", border: "1px solid rgba(255,255,255,0.15)", padding: "13px 28px", fontSize: 12, fontWeight: 600, letterSpacing: "0.8px", textTransform: "uppercase", borderRadius: 4, textDecoration: "none", transition: "background 0.2s ease, border-color 0.2s ease" }}>
              Read Our Story
            </a>
          </div>

          {/* Floating trust pills */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 36, animation: "heroFadeUp 0.9s ease 0.6s both" }}>
            {["100% Cotton", "Handmade in Jaipur", "Certified Non-Toxic Dyes"].map((pill) => (
              <span key={pill} style={{ background: "rgba(197,160,40,0.12)", border: "1px solid rgba(197,160,40,0.25)", color: "#d4b84a", fontSize: 11, fontWeight: 600, padding: "5px 14px", borderRadius: 20, letterSpacing: "0.5px" }}>
                ✦ {pill}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          2. MARQUEE STRIP
      ══════════════════════════════════════ */}
      <div style={{ background: "linear-gradient(135deg, #c5a028, #e8c547)", overflow: "hidden", padding: "14px 0", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", animation: "marquee 30s linear infinite", whiteSpace: "nowrap", gap: 0 }}>
          {[...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 20, padding: "0 24px", fontSize: 12, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", color: "#1c1917" }}>
              {item}
              <span style={{ opacity: 0.35, fontSize: 8 }}>◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════
          3. ANIMATED STATS
      ══════════════════════════════════════ */}
      <section style={{ background: "#fff", borderBottom: "1px solid #eae4d9" }}>
        <div className="container" style={{ maxWidth: 980, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", textAlign: "center" }}>
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 100}>
              <div style={{ padding: "38px 16px", borderRight: i < 3 ? "1px solid #eae4d9" : "none", position: "relative", overflow: "hidden" }}>
                {/* Subtle hover glow */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(197,160,40,0.03), transparent)", opacity: 0 }} />
                <div className="serif" style={{ fontSize: 46, fontWeight: 700, background: "linear-gradient(135deg, #b5860d, #e8c547, #c5a028)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1, marginBottom: 6 }}>
                  <AnimatedCounter target={s.value} suffix={s.suffix} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917", marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "#a8a09a", fontWeight: 500, letterSpacing: "0.5px" }}>{s.sub}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          4. FOUNDER STORY
      ══════════════════════════════════════ */}
      <section id="story" style={{ padding: "100px 20px", background: "#faf8f5" }}>
        <div className="container" style={{ maxWidth: 1160, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>

          {/* Image Side */}
          <Reveal>
            <div style={{ position: "relative" }}>
              {/* Gold border offset */}
              <div style={{ position: "absolute", top: -16, left: -16, right: 16, bottom: 16, border: "1.5px solid rgba(197,160,40,0.4)", borderRadius: 8, pointerEvents: "none" }} />
              <img
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85"
                alt="Zafiro Indio founder visiting artisan workshop in Sanganer, Jaipur"
                style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", borderRadius: 8, display: "block", position: "relative" }}
              />
              {/* Floating quote card */}
              <div style={{ position: "absolute", bottom: 32, right: -32, background: "linear-gradient(135deg, #0f0d0b, #1e1408)", color: "#f5ede0", padding: "22px 24px", borderRadius: 8, maxWidth: 220, boxShadow: "0 20px 50px rgba(0,0,0,0.28)", border: "1px solid rgba(197,160,40,0.2)", backdropFilter: "blur(4px)" }}>
                <Quote size={18} color="#c5a028" style={{ marginBottom: 10 }} />
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.65, fontStyle: "italic", color: "#d4c9b0" }}>
                  "I grew up watching my nani fold bedsheets with the care of folding a sari. That memory is what Zafiro is built on."
                </p>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(197,160,40,0.2)" }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#c5a028" }}>Aryan Kapoor</p>
                  <p style={{ margin: 0, fontSize: 10, color: "rgba(212,200,176,0.6)", fontWeight: 500 }}>Founder, Zafiro Indio</p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Story Side */}
          <Reveal delay={150}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase", color: "#a67c37", marginBottom: 16 }}>
              The Founder's Story
            </p>
            <h2 className="serif" style={{ fontSize: 40, fontWeight: 500, color: "#1c1917", margin: "0 0 12px", lineHeight: 1.15 }}>
              From a Jaipur Rooftop<br />to Every Indian Bedroom
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 30 }}>
              <div style={{ height: 2, width: 40, background: "linear-gradient(to right, #c5a028, transparent)" }} />
              <div style={{ height: 2, width: 90, background: "#eae4d9" }} />
            </div>

            <p style={{ fontSize: 15.5, lineHeight: 1.95, color: "#44403c", marginBottom: 20 }}>
              Growing up in Jaipur's old city, <strong style={{ color: "#1c1917" }}>Aryan Kapoor</strong> spent summers on the terrace watching neighbours hang freshly block-printed fabrics to dry in the afternoon sun — a ritual as old as the city itself. The colours, the patterns, the smell of natural dye in the Rajasthan heat. He didn't realise yet that it was extraordinary craft.
            </p>
            <p style={{ fontSize: 15.5, lineHeight: 1.95, color: "#44403c", marginBottom: 20 }}>
              After studying textile design in Ahmedabad and three years in Mumbai's corporate home furnishing world, Aryan returned to Jaipur in 2019 with one question burning in him: <em style={{ color: "#1c1917", fontStyle: "italic" }}>"Why is the world's finest block-print cotton sitting in a godown — while people in Delhi buy machine-printed polyester for twice the price?"</em>
            </p>
            <p style={{ fontSize: 15.5, lineHeight: 1.95, color: "#44403c", marginBottom: 32 }}>
              January 2020. A 200 sq ft studio in Sanganer. Six designs. One Karigar family. Aryan packed every order himself. Then the pandemic hit — and the orders kept coming. Today, Zafiro works with 40+ artisan partners, ships pan-India, and has delivered over 12,000 bedsheets — each one carrying a piece of Jaipur's living heritage.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {[
                "Founded in Sanganer — Jaipur's 500-year-old block-print capital",
                "Textile design graduate — craft-first, not commerce-first",
                "Direct-to-artisan model — zero middlemen, transparent pricing",
                "Fair Karigar Initiative — 30% above market pay for all partners",
              ].map((point) => (
                <div key={point} style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                  <CheckCircle2 size={16} color="#c5a028" style={{ marginTop: 3, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: "#57534e", lineHeight: 1.6 }}>{point}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════
          5. BRAND TIMELINE
      ══════════════════════════════════════ */}
      <section style={{ background: "#fff", borderTop: "1px solid #eae4d9", borderBottom: "1px solid #eae4d9", padding: "96px 20px" }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase", color: "#a67c37", marginBottom: 14 }}>Our Journey</p>
              <h2 className="serif" style={{ fontSize: 38, fontWeight: 500, color: "#1c1917" }}>The Zafiro Story, Year by Year</h2>
            </div>
          </Reveal>

          <div style={{ position: "relative" }}>
            {/* Centre line */}
            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "linear-gradient(to bottom, transparent, #c5a028 10%, #c5a028 90%, transparent)", transform: "translateX(-50%)" }} />

            {timeline.map((item, i) => {
              const isLeft = i % 2 === 0;
              return (
                <Reveal key={item.year} delay={i * 80}>
                  <div style={{ display: "flex", justifyContent: isLeft ? "flex-end" : "flex-start", marginBottom: 36, position: "relative" }}>
                    {/* Centre dot */}
                    <div style={{ position: "absolute", left: "50%", top: 24, transform: "translate(-50%, -50%)", width: 14, height: 14, borderRadius: "50%", background: "#c5a028", border: "3px solid #fff", boxShadow: "0 0 0 2px #c5a028", zIndex: 1 }} />

                    <div
                      style={{
                        width: "44%",
                        background: "#faf8f5",
                        border: "1px solid #e7e1d6",
                        borderRadius: 10,
                        padding: "22px 24px",
                        marginRight: isLeft ? "8%" : 0,
                        marginLeft: isLeft ? 0 : "8%",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <span style={{ fontSize: 20 }}>{item.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1.5px", color: "#c5a028" }}>{item.year}</span>
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1c1917", margin: "0 0 8px" }}>{item.title}</h3>
                      <p style={{ fontSize: 13.5, color: "#78716c", lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          6. HOW IT'S MADE — DARK GRID
      ══════════════════════════════════════ */}
      <section style={{ background: "linear-gradient(135deg, #0b0907 0%, #1a1208 100%)", padding: "96px 20px" }}>
        <div className="container" style={{ maxWidth: 1160 }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 18 }}>
                <div style={{ height: 1, width: 48, background: "linear-gradient(to right, transparent, #c5a028)" }} />
                <Gem size={14} color="#c5a028" />
                <div style={{ height: 1, width: 48, background: "linear-gradient(to left, transparent, #c5a028)" }} />
              </div>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase", color: "#c5a028", marginBottom: 14 }}>The Craft</p>
              <h2 className="serif" style={{ fontSize: 40, fontWeight: 500, color: "#f5ede0" }}>How a Zafiro Bedsheet is Born</h2>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "rgba(197,160,40,0.1)", borderRadius: 12, overflow: "hidden" }}>
            {craftSteps.map((item, i) => (
              <Reveal key={item.step} delay={i * 80}>
                <div
                  style={{
                    padding: "38px 32px",
                    background: "#0f0d0b",
                    transition: "background 0.3s ease",
                    cursor: "default",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#1a1408")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#0f0d0b")}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                    <item.icon size={22} color={item.color} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "2px", color: "rgba(197,160,40,0.5)", marginBottom: 10 }}>{item.step}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f5ede0", margin: "0 0 10px" }}>{item.title}</h3>
                  <p style={{ fontSize: 13.5, color: "rgba(245,237,224,0.5)", lineHeight: 1.8, margin: 0 }}>{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          7. OUR VALUES
      ══════════════════════════════════════ */}
      <section style={{ padding: "96px 20px", background: "#fff" }}>
        <div className="container" style={{ maxWidth: 1160 }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase", color: "#a67c37", marginBottom: 14 }}>Our Values</p>
              <h2 className="serif" style={{ fontSize: 38, fontWeight: 500, color: "#1c1917", margin: "0 0 14px" }}>What We Actually Stand For</h2>
              <p style={{ fontSize: 15, color: "#78716c", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>Real commitments. Held to every bedsheet we make.</p>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {values.map(({ Icon, color, bg, title, desc }, i) => (
              <Reveal key={title} delay={i * 70}>
                <div
                  style={{ background: "#faf8f5", border: "1px solid #eae4d9", borderRadius: 10, padding: "32px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.03)", transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease", cursor: "default" }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-5px)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 16px 40px rgba(0,0,0,0.09)";
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(197,160,40,0.35)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.03)";
                    (e.currentTarget as HTMLDivElement).style.borderColor = "#eae4d9";
                  }}
                >
                  <div style={{ width: 50, height: 50, borderRadius: 13, background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                    <Icon size={23} color={color} />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1c1917", margin: "0 0 10px" }}>{title}</h3>
                  <p style={{ fontSize: 13.5, color: "#78716c", lineHeight: 1.78, margin: 0 }}>{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          8. REVIEWS
      ══════════════════════════════════════ */}
      <section style={{ background: "#faf8f5", borderTop: "1px solid #eae4d9", padding: "88px 20px" }}>
        <div className="container" style={{ maxWidth: 1160 }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase", color: "#a67c37", marginBottom: 14 }}>Loved By Customers</p>
              <h2 className="serif" style={{ fontSize: 36, fontWeight: 500, color: "#1c1917" }}>12,000+ Homes. One Story.</h2>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
            {reviews.map((r, i) => (
              <Reveal key={r.name} delay={i * 100}>
                <div
                  style={{ background: "#fff", border: "1px solid #e7e1d6", borderRadius: 10, padding: "30px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.03)", transition: "transform 0.2s ease, box-shadow 0.2s ease", cursor: "default" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 32px rgba(0,0,0,0.08)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.03)"; }}
                >
                  <div style={{ display: "flex", gap: 3, marginBottom: 18 }}>
                    {[...Array(r.rating)].map((_, i) => <Star key={i} size={14} fill="#c5a028" color="#c5a028" />)}
                  </div>
                  <p className="serif" style={{ fontSize: 15.5, color: "#1c1917", lineHeight: 1.72, margin: "0 0 20px", fontStyle: "italic" }}>
                    "{r.text}"
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #c5a028, #e8c547)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#1c1917", flexShrink: 0 }}>
                      {r.name[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: "#a8a09a" }}>{r.city} · Verified Purchase</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          9. FINAL CTA
      ══════════════════════════════════════ */}
      <section style={{ position: "relative", background: "linear-gradient(135deg, #0b0907 0%, #1a1208 60%, #231808 100%)", padding: "96px 20px", textAlign: "center", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(197,160,40,0.14) 1px, transparent 1px)", backgroundSize: "30px 30px" }} />

        <Reveal>
          <div className="container" style={{ maxWidth: 700, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 22 }}>
              <div style={{ height: 1, width: 48, background: "linear-gradient(to right, transparent, #c5a028)" }} />
              <Heart size={14} color="#c5a028" fill="#c5a028" />
              <div style={{ height: 1, width: 48, background: "linear-gradient(to left, transparent, #c5a028)" }} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase", color: "#c5a028", marginBottom: 18 }}>Bring It Home</p>
            <h2 className="serif" style={{ fontSize: 42, fontWeight: 500, color: "#f5ede0", margin: "0 0 18px", lineHeight: 1.18 }}>
              Five Centuries of Craft.<br />Delivered to Your Door.
            </h2>
            <p style={{ color: "rgba(245,237,224,0.5)", fontSize: 15.5, lineHeight: 1.85, marginBottom: 38 }}>
              Every Zafiro bedsheet is a piece of living Rajasthani heritage — handmade, honest, and built to outlast the trends.
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/shop" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #c5a028, #e8c547)", color: "#1c1917", padding: "15px 32px", fontSize: 12, fontWeight: 800, letterSpacing: "0.8px", textTransform: "uppercase", borderRadius: 4, textDecoration: "none", boxShadow: "0 8px 30px rgba(197,160,40,0.4)" }}>
                Shop All Bedsheets <ArrowRight size={14} />
              </Link>
              <Link href="/collections" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: "#f5ede0", border: "1px solid rgba(245,237,224,0.18)", padding: "15px 32px", fontSize: 12, fontWeight: 600, letterSpacing: "0.8px", textTransform: "uppercase", borderRadius: 4, textDecoration: "none" }}>
                Explore Collections
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════
          GLOBAL KEYFRAMES
      ══════════════════════════════════════ */}
      <style>{`
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes subtleFloat {
          from { background-position: 0 0; }
          to   { background-position: 15px 15px; }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
        @media (max-width: 900px) {
          .container > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
          .container > div[style*="repeat(3, 1fr)"] {
            grid-template-columns: 1fr !important;
          }
          .container > div[style*="repeat(4, 1fr)"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </main>
  );
}
