import Link from "next/link";
import { collections } from "@/lib/data";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "Collections | Zafiro",
  description: "Explore Zafiro bedsheet collections curated for every style and mood.",
};

export default function Collections() {
  return (
    <main>
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="collectionHero">
        <p className="eyebrow">Curated Bedsheet Lines</p>
        <h1 className="serif">Collections</h1>
        <p>Curated bedsheet collections for every style and every mood.</p>
      </section>

      {/* ── Collection Grid ────────────────────────────────── */}
      <section className="section" style={{ background: "var(--paper)" }}>
        <div className="container">
          <div className="collectionGrid">
            {collections.map((c) => (
              <article className="collectionCard" id={c.slug} key={c.slug}>
                <div style={{ overflow: "hidden" }}>
                  <img
                    src={c.image}
                    alt={c.name}
                    loading="lazy"
                  />
                </div>
                <div className="pad">
                  <h2 className="serif">{c.name}</h2>
                  <p>{c.desc}</p>
                  <Link
                    className="btn gold"
                    href={`/shop?collection=${c.slug}`}
                    style={{ fontSize: 11 }}
                  >
                    Shop Collection <ArrowRight size={13} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
