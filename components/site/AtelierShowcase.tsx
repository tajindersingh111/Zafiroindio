"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { img, imgSrcSet, fallbackToOriginal } from "@/lib/img";
import type { Product } from "@/lib/data";

/**
 * The Zafiro Atelier — a drag-to-explore showcase rail.
 *
 * The depth is deliberately restrained: each plate is scaled, dimmed and lifted by its distance from
 * the centre of the stage, with at most a few degrees of rotation, so photographs stay rectangular and
 * sharp rather than warped. Everything rides on native horizontal scrolling, which means the trackpad,
 * a mouse wheel, touch, the arrow buttons and the keyboard all work without extra code, and the drag
 * handler only nudges `scrollLeft`.
 */
export default function AtelierShowcase({
  products,
  eyebrow = "The Zafiro Atelier",
  title,
  lede,
  href = "/shop",
}: {
  products: Product[];
  eyebrow?: string;
  title?: React.ReactNode;
  lede?: string;
  href?: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [progress, setProgress] = useState(0);
  // Pointer bookkeeping: `moved` tells a drag from a click so releasing after a drag never opens a product.
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });
  const frame = useRef(0);

  /** Depth pass: one CSS variable per plate, measured from the centre of the stage. */
  const measure = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const railBox = rail.getBoundingClientRect();
    const mid = railBox.left + railBox.width / 2;
    const reach = Math.max(railBox.width / 2, 1);
    for (const el of Array.from(rail.children) as HTMLElement[]) {
      const box = el.getBoundingClientRect();
      const d = Math.max(-1, Math.min(1, (box.left + box.width / 2 - mid) / reach));
      el.style.setProperty("--d", d.toFixed(3));
      el.style.setProperty("--a", Math.abs(d).toFixed(3));
    }
    const max = rail.scrollWidth - rail.clientWidth;
    setAtStart(rail.scrollLeft <= 2);
    setAtEnd(rail.scrollLeft >= max - 2);
    setProgress(max > 0 ? rail.scrollLeft / max : 0);
  }, []);

  const schedule = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      measure();
    });
  }, [measure]);

  useEffect(() => {
    measure();
    const rail = railRef.current;
    if (!rail) return;
    const ro = new ResizeObserver(schedule);
    ro.observe(rail);
    window.addEventListener("resize", schedule);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [measure, schedule]);

  /** One plate's worth of scrolling, so the arrows always land on a snap point. */
  function step(dir: 1 | -1) {
    const rail = railRef.current;
    if (!rail) return;
    const first = rail.firstElementChild as HTMLElement | null;
    const by = first ? first.offsetWidth + 22 : rail.clientWidth * 0.6;
    rail.scrollBy({ left: dir * by, behavior: "smooth" });
  }

  function onPointerDown(e: React.PointerEvent) {
    // Touch is left to the browser's own momentum scrolling; this is for mouse and pen.
    if (e.pointerType === "touch" || e.button !== 0) return;
    const rail = railRef.current;
    if (!rail) return;
    drag.current = { active: true, startX: e.clientX, startScroll: rail.scrollLeft, moved: false };
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    const rail = railRef.current;
    if (!drag.current.active || !rail) return;
    const dx = e.clientX - drag.current.startX;
    if (!drag.current.moved && Math.abs(dx) > 4) {
      drag.current.moved = true;
      rail.setPointerCapture?.(e.pointerId);
    }
    if (drag.current.moved) rail.scrollLeft = drag.current.startScroll - dx;
  }

  function endDrag(e: React.PointerEvent) {
    if (!drag.current.active) return;
    drag.current.active = false;
    setDragging(false);
    railRef.current?.releasePointerCapture?.(e.pointerId);
    // Let the click that follows a real drag through this element be swallowed, then forget it.
    if (drag.current.moved) setTimeout(() => { drag.current.moved = false; }, 0);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    step(e.key === "ArrowRight" ? 1 : -1);
  }

  if (!products.length) return null;

  return (
    <section className="hm-atelier">
      <div className="hm-atelier-glow" aria-hidden="true" />
      <div className="container">
        <div className="hm-atelier-head hm-reveal">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="serif">{title ?? <>Pieces from the <em>atelier floor</em></>}</h2>
            {lede && <p className="hm-atelier-lede">{lede}</p>}
          </div>
          <div className="hm-atelier-nav">
            <button type="button" className="hm-atelier-arrow" onClick={() => step(-1)} disabled={atStart} aria-label="Previous pieces">
              <ArrowLeft size={17} />
            </button>
            <button type="button" className="hm-atelier-arrow" onClick={() => step(1)} disabled={atEnd} aria-label="Next pieces">
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={railRef}
        className={`hm-atelier-rail${dragging ? " isDragging" : ""}`}
        role="region"
        aria-label="Atelier pieces — drag or use the arrow keys to explore"
        tabIndex={0}
        onScroll={schedule}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        onClickCapture={(e) => { if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); } }}
      >
        {products.map((p, i) => (
          <article className="hm-plate" key={p.slug}>
            <Link href={`/products/${p.slug}`} className="hm-plate-link" draggable={false}>
              <span className="hm-plate-frame">
                <img
                  src={img(p.images[0], 828)}
                  srcSet={imgSrcSet(p.images[0], [384, 640, 828, 1080])}
                  sizes="(max-width: 700px) 74vw, (max-width: 1100px) 42vw, 30vw"
                  alt={`${p.name} — hand block printed cotton`}
                  loading={i < 3 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  onError={fallbackToOriginal(p.images[0])}
                />
                <span className="hm-plate-rule" aria-hidden="true" />
                {p.badge && <span className="hm-plate-badge">{p.badge}</span>}
              </span>
              <span className="hm-plate-meta">
                <small>{p.fabric || "100% pure cotton"}</small>
                <strong className="serif">{p.name}</strong>
                <span className="hm-plate-price">
                  ₹{Math.round(p.price).toLocaleString("en-IN")}
                  {p.oldPrice > p.price && <s>₹{Math.round(p.oldPrice).toLocaleString("en-IN")}</s>}
                </span>
                <span className="hm-plate-cta">
                  View piece <ArrowRight size={13} aria-hidden="true" />
                </span>
              </span>
            </Link>
          </article>
        ))}
      </div>

      <div className="container hm-atelier-foot">
        <div className="hm-atelier-track" aria-hidden="true">
          {/* The thumb is 30% of the track, so a full pass is 70/30 of its own width. */}
          <i style={{ transform: `translateX(${(progress * 70 * 100) / 30}%)` }} />
        </div>
        <Link className="btn gold hm-atelier-all" href={href}>
          Enter the atelier <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}
