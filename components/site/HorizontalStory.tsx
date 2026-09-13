"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { RevealLine } from "./FabricReveal";

const PANELS = [
  {
    id: "p1",
    label: "The Block",
    title: "Carved from the same teak grove for three generations.",
    body: "Every motif begins as a drawing — then a month with a chisel. A master karigar carves each pattern into dense teak, cutting the outlines, the fill, and finally the fine details as three separate blocks that print in sequence.",
    image: "/editorial/craft.jpg",
    imageAlt: "Karigar pressing a hand-carved teak block onto cotton fabric in a Jaipur workshop",
  },
  {
    id: "p2",
    label: "The Dye",
    title: "Colour from earth, not a factory.",
    body: "Indigo from the Indigofera plant. Madder from roots. Turmeric from the spice market two streets away. Natural dyes are unpredictable — each batch shifts slightly with temperature and humidity. We call that character.",
    image: "/editorial/craft.jpg",
    imageAlt: "Natural dye vats and pigments in a Jaipur block print workshop",
  },
  {
    id: "p3",
    label: "The Print",
    title: "One pass, one breath, one perfect impression.",
    body: "A printer dips the block, shakes off the excess, positions by eye against the last impression — and stamps. Then waits. A single sheet can take three blocks and six hours of careful drying between each colour layer.",
    image: "/editorial/craft.jpg",
    imageAlt: "Freshly block-printed indigo and madder cotton fabric drying in a courtyard",
  },
  {
    id: "p4",
    label: "The Cloth",
    title: "Cut, washed, and folded — never quite the same twice.",
    body: "After the final dye pass, the fabric is washed in cool water to set the colour, then line-dried in the open air. Small variations in alignment, dye depth and registration make each piece unique. That's the point.",
    image: "/editorial/hero.jpg",
    imageAlt: "Finished hand block printed bedsheet draped over a carved wooden bed",
  },
];

export function HorizontalStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const x = useTransform(scrollYProgress, [0, 1], ["0%", `-${(PANELS.length - 1) * 100}%`]);

  return (
    <section
      ref={containerRef}
      className="relative bg-indigo"
      style={{ height: `${PANELS.length * 100}vh` }}
    >
      {/* Sticky horizontal scroll container */}
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Section label */}
        <div className="absolute top-10 left-10 z-10">
          <p className="text-turmeric text-xs uppercase tracking-[0.25em] font-medium">The Craft</p>
        </div>

        {/* Progress indicator */}
        <motion.div
          className="absolute bottom-10 left-10 z-10 flex gap-2 items-center"
        >
          {PANELS.map((_, i) => {
            const start = i / PANELS.length;
            const end = (i + 1) / PANELS.length;
            return (
              <motion.div
                key={i}
                className="h-px bg-paper/30 overflow-hidden"
                style={{ width: 40 }}
              >
                <motion.div
                  className="h-full bg-turmeric origin-left"
                  style={{
                    scaleX: useTransform(
                      scrollYProgress,
                      [start, end],
                      [0, 1]
                    ),
                  }}
                />
              </motion.div>
            );
          })}
          <span className="text-paper/40 text-xs ml-2 tracking-wider">Scroll to explore</span>
        </motion.div>

        {/* Moving strip of panels */}
        <motion.div
          style={{ x }}
          className="flex h-full"
          transition={{ ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {PANELS.map((panel) => (
            <div
              key={panel.id}
              className="min-w-[100vw] h-full grid grid-cols-1 md:grid-cols-2"
            >
              {/* Text side */}
              <div className="flex flex-col justify-center px-10 md:px-20 py-20 md:py-0 order-2 md:order-1">
                <RevealLine delay={0.1}>
                  <p className="text-turmeric text-xs uppercase tracking-[0.22em] mb-6 font-medium">
                    {panel.label}
                  </p>
                </RevealLine>
                <RevealLine delay={0.2}>
                  <h3 className="font-display text-editorial-md text-paper mb-6 leading-tight">
                    {panel.title}
                  </h3>
                </RevealLine>
                <RevealLine delay={0.32}>
                  <p className="text-paper/65 leading-relaxed max-w-md text-base">
                    {panel.body}
                  </p>
                </RevealLine>
              </div>

              {/* Image side */}
              <div className="relative order-1 md:order-2 overflow-hidden min-h-[50vh] md:min-h-0">
                <Image
                  src={panel.image}
                  alt={panel.imageAlt}
                  fill
                  className="object-cover"
                  sizes="50vw"
                  loading="lazy"
                />
                {/* Ink wash overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to right, rgba(33,47,82,0.5) 0%, transparent 40%)",
                  }}
                />
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
