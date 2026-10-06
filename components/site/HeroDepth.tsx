"use client";
import { useRef, type ReactNode } from "react";

/** Mouse-driven parallax: sets --mx/--my (-1..1) on the hero so layers move at different depths. */
export default function HeroDepth({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  return (
    <section
      ref={ref}
      className="hero"
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", String(((e.clientX - r.left) / r.width - 0.5) * 2));
        el.style.setProperty("--my", String(((e.clientY - r.top) / r.height - 0.5) * 2));
      }}
      onPointerLeave={() => {
        ref.current?.style.setProperty("--mx", "0");
        ref.current?.style.setProperty("--my", "0");
      }}
    >
      {children}
    </section>
  );
}
