"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Artisan } from "@/lib/storefront/artisans";
import { img as optimizedImg } from "@/lib/img";

const STEPS = [
  { title: "Carving", text: "Each motif is carved by hand into a wooden block, one block for every colour in the design." },
  { title: "Colour", text: "Colours are mixed in small batches in the workshop, so every run has its own depth." },
  { title: "Printing", text: "The printer presses the block along the fabric by eye, matching each impression to the last." },
  { title: "Finishing", text: "The fabric is sun-dried, washed to set the colour, then checked and finished by hand." },
];

/**
 * "Meet the Makers": the admin's artisans as a swipeable row of cards. Until any are added, hand-block
 * products show how the piece is made instead (and other products show nothing).
 */
export default function MeetTheMakers({ artisans, handBlock }: { artisans: Artisan[]; handBlock: boolean }) {
  const rail = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = rail.current;
    if (el) el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.9, 620), behavior: "smooth" });
  };

  if (artisans.length) {
    return (
      <section className="pdp-makers" aria-labelledby="pdp-makers-title">
        <div className="pdp-makers-head">
          <div>
            <p className="eyebrow">Handmade in Jaipur</p>
            <h2 id="pdp-makers-title" className="serif">Meet the Makers</h2>
          </div>
          {artisans.length > 1 && (
            <div className="pdp-makers-nav">
              <button type="button" aria-label="Previous maker" onClick={() => scroll(-1)}><ChevronLeft size={18} /></button>
              <button type="button" aria-label="Next maker" onClick={() => scroll(1)}><ChevronRight size={18} /></button>
            </div>
          )}
        </div>
        <div className="pdp-makers-rail" ref={rail}>
          {artisans.map((a) => (
            <article key={a.id} className="pdp-maker">
              <img src={optimizedImg(a.photo, 640)} alt={`${a.name}, ${a.craft}`} loading="lazy" />
              <div className="pdp-maker-body">
                <h3 className="serif">{a.name}</h3>
                <p className="pdp-maker-role">{[a.craft, a.place].filter(Boolean).join(" · ")}</p>
                {a.years ? <p className="pdp-maker-years"><strong>{a.years}</strong> years in the craft</p> : null}
                <p className="pdp-maker-story">{a.story}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (!handBlock) return null;
  return (
    <section className="pdp-makers pdp-process" aria-labelledby="pdp-makers-title">
      <div className="pdp-makers-head">
        <div>
          <p className="eyebrow">Handmade in Jaipur</p>
          <h2 id="pdp-makers-title" className="serif">How Your Piece Is Made</h2>
        </div>
      </div>
      <div className="pdp-process-grid">
        <div className="pdp-process-photos" aria-hidden="true">
          <img src="/editorial/craft.jpg" alt="" loading="lazy" />
          <img src="/editorial/heritage.jpg" alt="" loading="lazy" />
        </div>
        <ol className="pdp-process-steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="serif">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
