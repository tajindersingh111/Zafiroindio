"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BlockPattern } from "@/components/BlockPattern";

const SWATCHES = [
  {
    id: "indigo-lattice",
    name: "Indigo Lattice",
    origin: "Indigo vat dye on unbleached cotton",
    motif: "trellis" as const,
    colorway: ["#f4ecd8", "#212f52", "#a83a26"] as [string, string, string],
    description:
      "A geometric lattice motif printed in indigo vat dye — one of the oldest dye traditions in Rajasthan. Each diamond is stamped individually, which is why the edges carry a faint human trace.",
  },
  {
    id: "madder-bloom",
    name: "Madder Bloom",
    origin: "Madder root red on natural cotton",
    motif: "bloom" as const,
    colorway: ["#fbf6ea", "#a83a26", "#cf9a2e"] as [string, string, string],
    description:
      "The bloom pattern is printed with madder — a dye extracted from dried plant roots that creates this specific warm red, impossible to replicate exactly with synthetic alternatives.",
  },
  {
    id: "turmeric-paisley",
    name: "Turmeric Paisley",
    origin: "Turmeric discharge on cotton",
    motif: "paisley" as const,
    colorway: ["#ece0c4", "#cf9a2e", "#212f52"] as [string, string, string],
    description:
      "The paisley motif — known in Rajasthan as 'mango' — is stamped row by row with a long curved block. The slight misalignment between rows is intentional — it marks the hand, distinguishing this fabric from machine-printed copies.",
  },
];

export function TextureViewer() {
  const [active, setActive] = useState(SWATCHES[0]);
  const [zoomed, setZoomed] = useState(false);

  return (
    <section className="bg-paper-deep py-24 md:py-32 overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        {/* Header */}
        <div className="mb-16 md:mb-20">
          <p className="text-madder text-xs uppercase tracking-[0.22em] mb-4 font-medium">Up close</p>
          <h2 className="font-display text-editorial-lg text-indigo max-w-lg">
            The weave tells you everything.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-start">
          {/* Swatch selector */}
          <div className="md:col-span-4 flex flex-col gap-3">
            {SWATCHES.map((swatch) => (
              <button
                key={swatch.id}
                onClick={() => {
                  setActive(swatch);
                  setZoomed(false);
                }}
                className={`flex items-center gap-4 p-4 text-left transition-all duration-500 rounded-sm border ${
                  active.id === swatch.id
                    ? "border-indigo/30 bg-paper shadow-sm"
                    : "border-transparent hover:border-stone/30 hover:bg-paper/50"
                }`}
              >
                {/* Mini swatch preview */}
                <div className="w-14 h-14 rounded-sm overflow-hidden shrink-0 border border-stone/20">
                  <BlockPattern
                    motif={swatch.motif}
                    colorway={swatch.colorway}
                    className="w-full h-full"
                  />
                </div>
                <div>
                  <p className="font-display text-indigo text-base leading-tight">
                    {swatch.name}
                  </p>
                  <p className="text-xs text-stone mt-0.5 leading-snug">{swatch.origin}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Large swatch viewer */}
          <div className="md:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                {/* Main swatch display */}
                <motion.div
                  className="relative aspect-[4/3] rounded-sm overflow-hidden border border-stone/30 cursor-zoom-in mb-6"
                  animate={{ scale: zoomed ? 1.8 : 1 }}
                  transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                  onClick={() => setZoomed((z) => !z)}
                >
                  <BlockPattern
                    motif={active.motif}
                    colorway={active.colorway}
                    className="w-full h-full"
                  />
                  {/* Zoom hint */}
                  {!zoomed && (
                    <div className="absolute bottom-4 right-4 bg-indigo/80 text-paper text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-sm">
                      Click to zoom
                    </div>
                  )}
                </motion.div>

                {/* Description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-display text-xl text-indigo mb-2">{active.name}</h3>
                    <p className="text-xs text-madder uppercase tracking-wider font-medium mb-3">
                      {active.origin}
                    </p>
                    <p className="text-ink-soft leading-relaxed text-sm">{active.description}</p>
                  </div>
                  <div className="flex flex-col justify-end">
                    <a
                      href="/shop"
                      className="inline-flex items-center gap-2 text-sm uppercase tracking-wider text-indigo hover:text-madder transition-colors font-medium"
                    >
                      Shop this collection
                      <span>→</span>
                    </a>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
