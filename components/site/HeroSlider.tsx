"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import SmartImg from "@/components/SmartImg";

export type HeroSlide = { id: string; title: string; subtitle: string; ctaText: string; ctaLink: string; image: string };

/**
 * Homepage hero: every active banner from Admin → Marketing → Banners, cross-fading every 6.5 s.
 * Pauses on hover / keyboard focus, and never auto-plays for visitors who prefer reduced motion.
 */
export default function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const n = slides.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = useCallback((i: number) => setActive(((i % n) + n) % n), [n]);

  useEffect(() => {
    if (n < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setActive((a) => (a + 1) % n), 6500);
    return () => clearInterval(t);
  }, [n, paused]);

  const s = slides[active];
  return (
    <div
      className="heroSlider"
      aria-roledescription="carousel"
      aria-label="Featured collections"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {slides.map((sl, i) => (
        <SmartImg
          key={sl.id}
          src={sl.image}
          width={1920}
          widths={[828, 1200, 1920]}
          sizes="100vw"
          alt={i === active ? sl.title : ""}
          aria-hidden={i !== active}
          className={`heroImg heroSlide${i === active ? " isActive" : ""}`}
          fetchPriority={i === 0 ? "high" : "low"}
          loading={i === 0 ? "eager" : "lazy"}
        />
      ))}
      <div className="container">
        <div className="heroContent">
          <div key={s.id} className="heroEnter" aria-live={paused ? "polite" : "off"}>
            <span className="eyebrow">
              <Sparkles size={12} className="text-[#c5a028]" /> Heritage Jaipur Handblock
            </span>
            <h1 className="serif">{s.title}</h1>
            {s.subtitle && <p>{s.subtitle}</p>}
            <div className="heroBtns">
              <Link href={s.ctaLink} className="btn gold">
                {s.ctaText} <ArrowRight size={14} />
              </Link>
              <Link href="/collections" className="btn outline">
                Explore Edits
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* Outside the parallax layer, so the dots don't move while you aim at them. */}
      {n > 1 && (
        <div className="container heroControlsWrap">
          <div className="heroControls">
            <button type="button" className="heroArrow" aria-label="Previous banner" onClick={() => go(active - 1)}>
              <ChevronLeft size={16} />
            </button>
            {slides.map((sl, i) => (
              <button
                key={sl.id}
                type="button"
                className={`heroDot${i === active ? " isActive" : ""}`}
                aria-label={`Show banner ${i + 1}: ${sl.title}`}
                aria-current={i === active}
                onClick={() => go(i)}
              />
            ))}
            <button type="button" className="heroArrow" aria-label="Next banner" onClick={() => go(active + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
