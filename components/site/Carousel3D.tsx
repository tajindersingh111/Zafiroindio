"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { img, imgSrcSet, fallbackToOriginal } from "@/lib/img";

export type CarouselItem = { slug: string; name: string; price: number; image: string };

/**
 * Draggable, auto-rotating 3D ring of product cards (pure CSS 3D, no extra libraries).
 * The rotation is written straight to the ring's style each frame (no React re-render), and the
 * animation sleeps while the ring is off screen.
 */
export default function Carousel3D({ items }: { items: CarouselItem[] }) {
  const ring = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const angle = useRef(0);
  const drag = useRef<{ x: number; a: number; moved: boolean } | null>(null);
  const paused = useRef(false);
  const visible = useRef(false);
  const [radius, setRadius] = useState(380);

  useEffect(() => {
    const calc = () => setRadius(Math.min(420, Math.max(200, window.innerWidth * 0.34)));
    calc();
    window.addEventListener("resize", calc);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting));
    if (root.current) io.observe(root.current);
    let id = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(64, t - last);
      last = t;
      if (visible.current && !paused.current && !drag.current && !reduce) {
        angle.current -= dt * 0.012;
        paint();
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(id);
      io.disconnect();
      window.removeEventListener("resize", calc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => paint());

  function paint() {
    if (ring.current) ring.current.style.transform = `translateZ(-${radius}px) rotateY(${angle.current}deg)`;
  }

  if (items.length < 3) return null;
  const step = 360 / items.length;

  return (
    <div
      ref={root}
      className="c3d"
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, a: angle.current, moved: false };
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const dx = e.clientX - drag.current.x;
        if (Math.abs(dx) > 4) drag.current.moved = true;
        angle.current = drag.current.a + dx * 0.35;
        paint();
      }}
      onPointerUp={() => setTimeout(() => (drag.current = null), 0)}
      onPointerLeave={() => {
        drag.current = null;
        paused.current = false;
      }}
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      role="list"
      aria-label="Featured bedsheets"
    >
      <div ref={ring} className="c3d-ring" style={{ transform: `translateZ(-${radius}px) rotateY(0deg)` }}>
        {items.map((p, i) => (
          <Link
            role="listitem"
            key={p.slug}
            href={`/products/${p.slug}`}
            className="c3d-card"
            style={{ transform: `rotateY(${i * step}deg) translateZ(${radius}px)` }}
            onClick={(e) => drag.current?.moved && e.preventDefault()}
            draggable={false}
          >
            <img src={img(p.image, 384)} srcSet={imgSrcSet(p.image, [256, 384, 640])} sizes="240px" onError={fallbackToOriginal(p.image)} alt={p.name} draggable={false} loading="lazy" decoding="async" />
            <span className="c3d-cap">
              <b className="serif">{p.name}</b>
              <i>₹{p.price.toLocaleString("en-IN")}</i>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
