"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Quote, Gem, HandHeart, Sprout, Flame, Globe, CheckCircle2, Heart, Sparkles, Package, PenTool, Factory, Headphones } from "lucide-react";
import type { Founder } from "@/lib/storefront/founders";

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
  "Our Own Manufacturing",
  "7-Day Exchange",
  "Made in Rajasthan",
  "Designed In-House",
];

const stats = [
  { value: 30, suffix: "+", label: "Years in Textiles", sub: "Our founder's experience" },
  { value: 5, suffix: "", label: "Years of Our Own Unit", sub: "Manufacturing in-house" },
  { value: 100, suffix: "%", label: "Cotton", sub: "No synthetic blends" },
  { value: 7, suffix: "-Day", label: "Exchange Window", sub: "Unboxing video required" },
];

const timeline = [
  {
    year: "30 Years",
    title: "Learning the Cloth",
    desc: "Neelu Singh spends three decades inside the textile industry — weave, dye, print, finish. Long enough to judge a fabric by hand before the eye catches up.",
    icon: "🧵",
  },
  {
    year: "The Dream",
    title: "A Name of Her Own",
    desc: "All that knowledge had gone into beautiful things carrying somebody else's label. The idea she kept returning to was a brand that was entirely hers.",
    icon: "💡",
  },
  {
    year: "5 Years Ago",
    title: "Our Own Floor",
    desc: "Zafiro Indio starts its own manufacturing. Quality stops being something to hope for from a supplier and becomes a decision made in-house.",
    icon: "🏭",
  },
  {
    year: "Today",
    title: "Under One Roof",
    desc: "Supported by JHB Industries, fabric is chosen, printed and finished under her own eye — design, production and customer care in one place.",
    icon: "🏠",
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
  { Icon: Sprout, color: "#2d6a4f", bg: "#f0faf5", title: "Sustainable by Design", desc: "AZO-free dyes and pure cotton, with no synthetic fibres. Every choice made with the planet — and your skin — in mind." },
  { Icon: HandHeart, color: "#9b2335", bg: "#fff5f6", title: "Made by Hand", desc: "Block carving, printing, drying, washing and checking are done by people, not machines. That is what makes each piece slightly its own." },
  { Icon: Factory, color: "#b5860d", bg: "#fffbf0", title: "Our Own Floor", desc: "We run our own manufacturing rather than outsourcing it, so quality is a decision we make instead of one we hope a supplier makes for us." },
  { Icon: ShieldCheck, color: "#1d4ed8", bg: "#f0f4ff", title: "Quality You Can Feel", desc: "Every piece is checked for weave, print alignment, colour fastness and finish. If it doesn't pass, it doesn't ship." },
  { Icon: Globe, color: "#6d28d9", bg: "#f5f0ff", title: "India to Every Bedroom", desc: "Delivered across India, direct from our own unit — no retail markup in between." },
  { Icon: Flame, color: "#c2410c", bg: "#fff7f0", title: "Keeping the Craft Alive", desc: "Hand block printing is centuries old. Making it a working trade, not a museum piece, is part of why we do this." },
];

const pillars = [
  {
    num: "01",
    Icon: PenTool,
    color: "#9b2335",
    bg: "#fff5f6",
    title: "Design & Innovation",
    desc: "Every product starts as a drawing, not a purchase order. Inspired by global trends and the way people actually live, each collection is made to balance elegance, comfort and use.",
  },
  {
    num: "02",
    Icon: Factory,
    color: "#b5860d",
    bg: "#fffbf0",
    title: "Craftsmanship & Production",
    desc: "Our own unit, supported by JHB Industries, is where fabric is selected, printed and finished. Owning the floor is why quality is decided rather than hoped for.",
  },
  {
    num: "03",
    Icon: Headphones,
    color: "#1d4ed8",
    bg: "#f0f4ff",
    title: "Customer Experience",
    desc: "The parcel is the last thing we make. Easy ordering, honest answers and service that holds up after the sale — the part of the product you cannot photograph.",
  },
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
export default function AboutContent({ founders = [] }: { founders?: Founder[] }) {
  // The first founder fronts the story block; the rest appear in the founders grid below it.
  const lead = founders[0];
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
            Jaipur · Rajasthan · Handblock Textiles
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
      <section id="story" style={{ padding: "100px 20px 88px", background: "#faf8f5" }}>
        <div className="container about-split" style={{ maxWidth: 1160 }}>

          {/* Portrait side */}
          <Reveal>
            <figure className="about-portrait">
              <span className="about-portrait-frame" aria-hidden />
              <img
                src={lead?.photo ?? "/editorial/neelu.jpg"}
                alt={lead ? `${lead.name}, ${lead.role} of Zafiro Indio` : "Founder of Zafiro Indio"}
                loading="lazy"
                decoding="async"
                className="about-portrait-img"
              />
              <figcaption className="about-quote-card">
                <Quote size={18} color="#c5a028" style={{ marginBottom: 10 }} />
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.7, fontStyle: "italic", color: "#d4c9b0" }}>
                  &ldquo;Thirty years have been spent understanding every thread and design of the fabric. I always had a
                  dream: to create a brand that was completely my own.&rdquo;
                </p>
                <span style={{ display: "block", marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(197,160,40,0.2)" }}>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#c5a028" }}>{lead?.name ?? "Neelu Singh"}</span>
                  <span style={{ display: "block", fontSize: 10, color: "rgba(212,200,176,0.6)", fontWeight: 500 }}>
                    {lead?.role ?? "Founder"}, Zafiro Indio
                  </span>
                </span>
              </figcaption>
            </figure>
          </Reveal>

          {/* Story side */}
          <Reveal delay={150}>
            <p className="about-eyebrow">The Founder&rsquo;s Story</p>
            <h2 className="serif about-h2">
              Thirty Years of Thread.<br />One Name of Her Own.
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 30 }}>
              <span style={{ height: 2, width: 40, background: "linear-gradient(to right, #c5a028, transparent)" }} />
              <span style={{ height: 2, width: 90, background: "#eae4d9" }} />
            </div>

            <p className="about-body">
              Zafiro Indio began with <strong>Neelu Singh</strong> and three decades spent inside the textile industry
              &mdash; long enough to know a fabric by hand before the eye catches up. The weight of a weave, how a dye will
              settle, whether a design will hold its line across the width of the cloth. Thirty years of reading thread.
            </p>
            <p className="about-body">
              For most of those years, that knowledge went into beautiful things that carried somebody else&rsquo;s label.
              The dream she kept returning to was a simpler one: a brand that was entirely her own, where the standard was
              hers to set and hers to answer for.
            </p>
            <p className="about-body">
              Five years ago that dream took a concrete shape: she started her own manufacturing. It is the decision that
              changed what the brand could promise. Precision and quality stopped being something to hope for from a
              supplier and became something decided in-house, at every stage, by the person whose name is on the label.
            </p>
            <p className="about-body" style={{ marginBottom: 32 }}>
              With the support of <strong>JHB Industries</strong>, that unit is where fabric is chosen, printed and
              finished under her own eye. It is an unglamorous answer to a simple question &mdash; how do you make sure
              every piece is right? &mdash; and it is the reason Zafiro Indio is a brand rather than an idea.
            </p>

            <ul className="about-points">
              {[
                "Thirty years in textiles before the first Zafiro Indio label",
                "Own manufacturing for five years — quality decided in-house, not outsourced",
                "Production supported by JHB Industries, from fabric selection to finishing",
                "Design, production and customer care under one roof",
              ].map((point) => (
                <li key={point}>
                  <CheckCircle2 size={16} color="#c5a028" aria-hidden />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════
          4b. THE FOUNDERS  (Admin → Content → Founders)
      ══════════════════════════════════════ */}
      {founders.length > 0 && (
        <section style={{ padding: "0 20px 96px", background: "#faf8f5" }}>
          <div className="container" style={{ maxWidth: 1060 }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: 46 }}>
                <p className="about-eyebrow" style={{ textAlign: "center" }}>Our Founder</p>
                <h2 className="serif about-h2-sm">The Name Behind the Label</h2>
              </div>
            </Reveal>

            <div className="about-founders">
              {founders.map((f, i) => (
                <Reveal key={f.id} delay={i * 120}>
                  <article className="about-founder-card">
                    <img
                      src={f.photo}
                      alt={`${f.name}, ${f.role} of Zafiro Indio`}
                      loading="lazy"
                      decoding="async"
                      className="about-founder-img"
                    />
                    <div className="about-founder-body">
                      <h3 className="serif">{f.name}</h3>
                      <p className="about-founder-role">{f.role}</p>
                      {f.title && <p className="about-founder-title">{f.title}</p>}
                      <p className="about-founder-blurb">{f.blurb}</p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════
          4c. HOW WE WORK
      ══════════════════════════════════════ */}
      <section style={{ padding: "90px 20px", background: "#fff", borderTop: "1px solid #eae4d9" }}>
        <div className="container" style={{ maxWidth: 1060 }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 50 }}>
              <p className="about-eyebrow" style={{ textAlign: "center" }}>How We Work</p>
              <h2 className="serif about-h2-sm">Three Things We Refuse to Rush</h2>
              <p style={{ fontSize: 15, color: "#78716c", lineHeight: 1.8, maxWidth: 560, margin: "14px auto 0" }}>
                Design, production, and the person who opens the parcel. Everything we do sits under one of these three.
              </p>
            </div>
          </Reveal>

          <div className="about-pillars">
            {pillars.map((p, i) => (
              <Reveal key={p.title} delay={i * 110}>
                <div className="about-pillar">
                  <span className="about-pillar-num">{p.num}</span>
                  <span className="about-pillar-icon" style={{ background: p.bg, color: p.color }}>
                    <p.Icon size={20} />
                  </span>
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
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
              <h2 className="serif" style={{ fontSize: 38, fontWeight: 500, color: "#1c1917" }}>How Zafiro Indio Came to Be</h2>
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
        /* ── About page layout ──────────────────────────────
           Real classes with real breakpoints. The grids used to be collapsed by matching on the
           serialised inline style ([style*="grid-template-columns: 1fr 1fr"]), which silently
           stops working the moment a style is reordered or a space changes. */
        .about-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
        }

        .about-eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: #a67c37;
          margin: 0 0 16px;
        }
        .about-h2 {
          font-size: clamp(28px, 4.2vw, 40px);
          font-weight: 500;
          color: #1c1917;
          margin: 0 0 12px;
          line-height: 1.15;
        }
        .about-h2-sm {
          font-size: clamp(25px, 3.4vw, 34px);
          font-weight: 500;
          color: #1c1917;
          margin: 0;
          line-height: 1.2;
        }
        .about-body {
          font-size: 15.5px;
          line-height: 1.95;
          color: #44403c;
          margin: 0 0 20px;
        }
        .about-body strong { color: #1c1917; font-weight: 600; }

        .about-points { list-style: none; margin: 0; padding: 0; display: grid; gap: 13px; }
        .about-points li { display: flex; align-items: flex-start; gap: 11px; }
        .about-points li svg { margin-top: 3px; flex-shrink: 0; }
        .about-points span { font-size: 14px; color: #57534e; line-height: 1.6; }

        /* Portrait with the offset gold frame and the floating quote card. */
        .about-portrait { position: relative; margin: 0; }
        .about-portrait-frame {
          position: absolute;
          inset: -16px 16px 16px -16px;
          border: 1.5px solid rgba(197, 160, 40, 0.4);
          border-radius: 8px;
          pointer-events: none;
        }
        .about-portrait-img {
          width: 100%;
          aspect-ratio: 4 / 5;
          object-fit: cover;
          border-radius: 8px;
          display: block;
          position: relative;
        }
        .about-quote-card {
          position: absolute;
          bottom: 32px;
          right: -32px;
          max-width: 230px;
          background: linear-gradient(135deg, #0f0d0b, #1e1408);
          color: #f5ede0;
          padding: 22px 24px;
          border-radius: 8px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.28);
          border: 1px solid rgba(197, 160, 40, 0.2);
        }

        /* Founder cards (Admin → Content → Founders). */
        .about-founders {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 28px;
        }
        .about-founder-card {
          background: #fff;
          border: 1px solid #eae4d9;
          border-radius: 10px;
          overflow: hidden;
          height: 100%;
          display: flex;
          flex-direction: column;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .about-founder-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 40px rgba(28, 25, 23, 0.1);
        }
        .about-founder-img {
          width: 100%;
          aspect-ratio: 4 / 5;
          object-fit: cover;
          object-position: center top;
          display: block;
          background: #f3efe8;
        }
        .about-founder-body { padding: 22px 22px 26px; }
        .about-founder-body h3 { font-size: 23px; font-weight: 600; color: #1c1917; margin: 0 0 5px; }
        .about-founder-role {
          margin: 0 0 3px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: #a67c37;
        }
        .about-founder-title { margin: 0 0 14px; font-size: 12.5px; color: #a8a09a; font-weight: 500; }
        .about-founder-blurb { margin: 0; font-size: 14px; color: #57534e; line-height: 1.75; }

        /* How we work. */
        .about-pillars {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 24px;
        }
        .about-pillar {
          position: relative;
          height: 100%;
          background: #faf8f5;
          border: 1px solid #eae4d9;
          border-radius: 10px;
          padding: 30px 26px 28px;
          overflow: hidden;
        }
        .about-pillar h3 { font-size: 16.5px; font-weight: 700; color: #1c1917; margin: 0 0 9px; }
        .about-pillar p { font-size: 14px; color: #78716c; line-height: 1.8; margin: 0; }
        .about-pillar-num {
          position: absolute;
          top: 12px;
          right: 18px;
          font-size: 44px;
          font-weight: 800;
          line-height: 1;
          color: rgba(197, 160, 40, 0.13);
          pointer-events: none;
        }
        .about-pillar-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 10px;
          margin-bottom: 16px;
        }

        @media (max-width: 900px) {
          .about-split { grid-template-columns: 1fr; gap: 52px; }
          /* The quote card hangs off the portrait on desktop; on a phone that would overflow. */
          .about-quote-card {
            position: static;
            max-width: none;
            margin-top: 18px;
            box-shadow: none;
          }
          .about-portrait-frame { display: none; }

          .container > div[style*="repeat(3, 1fr)"] {
            grid-template-columns: 1fr !important;
          }
          .container > div[style*="repeat(4, 1fr)"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .about-founder-card { transition: none; }
          .about-founder-card:hover { transform: none; }
        }
      `}</style>
    </main>
  );
}
