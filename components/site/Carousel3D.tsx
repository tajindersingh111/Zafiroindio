"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/data";

/** Draggable, auto-rotating 3D ring of product cards (pure CSS 3D, no extra libraries). */
export default function Carousel3D({ products }: { products: Product[] }) {
  const items = products.slice(0, 8);
  const [angle, setAngle] = useState(0);
  const drag = useRef<{ x: number; a: number; moved: boolean } | null>(null);
  const paused = useRef(false);
  const [radius, setRadius] = useState(380);

  useEffect(() => {
    const calc = () => setRadius(Math.min(420, Math.max(200, window.innerWidth * 0.34)));
    calc();
    window.addEventListener("resize", calc);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let id = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      if (!paused.current && !drag.current && !reduce) setAngle((a) => a - dt * 0.012);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", calc);
    };
  }, []);

  if (items.length < 3) return null;
  const step = 360 / items.length;

  return (
    <div
      className="c3d"
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, a: angle, moved: false };
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const dx = e.clientX - drag.current.x;
        if (Math.abs(dx) > 4) drag.current.moved = true;
        setAngle(drag.current.a + dx * 0.35);
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
      <div className="c3d-ring" style={{ transform: `translateZ(-${radius}px) rotateY(${angle}deg)` }}>
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
            <img src={p.images[0]} alt={p.name} draggable={false} loading="lazy" />
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
