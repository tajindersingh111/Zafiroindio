"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import SmartImg from "@/components/SmartImg";

export type HeroSlide = { id: string; title: string; subtitle: string; ctaText: string; ctaLink: string; image: string };

/** How long each banner stays up is set in app/home.css (`--hero-dwell`), which drives the progress bar. */
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Homepage hero: every active banner from Admin → Marketing → Banners, cross-fading.
 *
 * Autoplay is driven by the progress bar's own CSS animation: when it finishes, the next banner
 * shows. That keeps the bar and the timing as one thing, so pausing (hover or keyboard focus) simply
 * freezes the bar and the timer together. For visitors who prefer reduced motion the animation is
 * switched off in CSS, so nothing ever auto-advances.
 */
export default function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const n = slides.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = useCallback((i: number) => setActive(((i % n) + n) % n), [n]);

  const s = slides[active];
  return (
    <div
      className={`heroSlider${paused ? " isPaused" : ""}`}
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
      {/* Outside the parallax layer, so the controls don't move while you aim at them. */}
      {n > 1 && (
        <div className="container heroControlsWrap">
          <div className="heroControls">
            <span className="heroCount" aria-hidden="true">
              <b>{pad(active + 1)}</b>
              <i /> {pad(n)}
            </span>
            <div className="heroSegs" role="group" aria-label="Choose a banner">
              {slides.map((sl, i) => (
                <button
                  key={sl.id}
                  type="button"
                  className={`heroSeg${i === active ? " isActive" : ""}${i < active ? " isDone" : ""}`}
                  aria-label={`Show banner ${i + 1}: ${sl.title}`}
                  aria-current={i === active}
                  onClick={() => go(i)}
                >
                  {/* The fill restarts whenever this banner becomes the active one. */}
                  <i onAnimationEnd={i === active ? () => go(active + 1) : undefined} />
                </button>
              ))}
            </div>
            <button type="button" className="heroArrow" aria-label="Previous banner" onClick={() => go(active - 1)}>
              <ChevronLeft size={16} />
            </button>
            <button type="button" className="heroArrow" aria-label="Next banner" onClick={() => go(active + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
