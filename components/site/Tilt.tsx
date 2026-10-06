"use client";
import { useRef, type ReactNode, type CSSProperties } from "react";

/**
 * 3D tilt: the child plane rotates toward the pointer with a moving gold glare.
 * Disabled on touch devices and for prefers-reduced-motion.
 */
export default function Tilt({ children, max = 8, className, style }: { children: ReactNode; max?: number; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  const enabled = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function move(e: React.PointerEvent) {
    if (!enabled() || !ref.current) return;
    const el = ref.current;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty("--rx", `${((0.5 - y) * max * 2).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((x - 0.5) * max * 2).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
    });
  }
  function leave() {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <div className="tilt-wrap" style={style}>
      <div ref={ref} className={`tilt ${className ?? ""}`} onPointerMove={move} onPointerLeave={leave}>
        {children}
        <span className="tilt-glare" aria-hidden />
      </div>
    </div>
  );
}
