"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface Hotspot {
  id: string;
  x: number; // percent from left
  y: number; // percent from top
  label: string;
  price: string;
  href: string;
}

const HOTSPOTS: Hotspot[] = [
  { id: "hs1", x: 52, y: 58, label: "Indigo Lattice Bedsheet", price: "₹2,400", href: "/shop" },
  { id: "hs2", x: 22, y: 72, label: "Madder Geometric Rug", price: "₹3,800", href: "/shop" },
  { id: "hs3", x: 74, y: 35, label: "Turmeric Block-Print Throw", price: "₹1,600", href: "/shop" },
];

export function ShoppableScene() {
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <section className="relative w-full overflow-hidden" style={{ height: "90vh", minHeight: "560px" }}>
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/editorial/lifestyle.jpg"
          alt="Zafiro Indio hand block-printed textiles in a luxury bedroom setting"
          fill
          className="object-cover"
          sizes="100vw"
          loading="lazy"
        />
        {/* Dark vignette overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(33,47,82,0.25) 0%, rgba(33,47,82,0.05) 40%, rgba(33,47,82,0.55) 100%)",
          }}
        />
      </div>

      {/* Hotspots */}
      <div ref={containerRef} className="absolute inset-0">
        {HOTSPOTS.map((hs) => (
          <div
            key={hs.id}
            className="absolute"
            style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
          >
            {/* Pulse ring + marker */}
            <button
              onClick={() => setActiveHotspot(activeHotspot === hs.id ? null : hs.id)}
              className="relative w-8 h-8 flex items-center justify-center group"
              aria-label={`View product: ${hs.label}`}
            >
              {/* Pulse rings */}
              <span className="absolute inline-flex w-8 h-8 rounded-full bg-paper/30 animate-ping" />
              <span className="absolute inline-flex w-8 h-8 rounded-full bg-paper/20" />
              {/* Core dot */}
              <span className="relative w-5 h-5 rounded-full bg-paper flex items-center justify-center shadow-lg group-hover:bg-turmeric transition-colors duration-300">
                <span className="text-indigo font-bold text-xs leading-none">+</span>
              </span>
            </button>

            {/* Tooltip */}
            <AnimatePresence>
              {activeHotspot === hs.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: 8 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="absolute z-20 bottom-full mb-3 left-1/2 -translate-x-1/2 w-52 bg-paper rounded-sm shadow-2xl overflow-hidden"
                >
                  <div className="px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-madder mb-1">
                      Hand Block Printed
                    </p>
                    <p className="font-display text-sm text-indigo leading-tight mb-2">{hs.label}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">{hs.price}</span>
                      <Link
                        href={hs.href}
                        className="text-[11px] uppercase tracking-wider text-madder hover:text-indigo transition-colors font-medium"
                      >
                        Shop →
                      </Link>
                    </div>
                  </div>
                  {/* Accent line */}
                  <div className="h-0.5 bg-gradient-to-r from-madder via-turmeric to-transparent" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Bottom text overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-8 md:px-16 pb-14 pt-24"
        style={{ background: "linear-gradient(to top, rgba(33,47,82,0.75) 0%, transparent 100%)" }}
      >
        <p className="text-paper/60 text-xs uppercase tracking-[0.2em] mb-2">Tap to discover</p>
        <h2 className="font-display text-editorial-md text-paper italic">
          Every room, a small gallery.
        </h2>
      </div>
    </section>
  );
}
