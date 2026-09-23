import Link from "next/link";
import { collections } from "@/lib/data";

export const metadata = {
  title: "Bedsheet Collections | Floral, Minimal, Luxury, Block Print | Zafiro Indio",
  description: "Explore Zafiro Indio's curated bedsheet collections — hand-block printed floral, clean minimal, bold printed, premium luxury & everyday comfort cotton bedsheets from Jaipur.",
  keywords: ["bedsheet collections India", "floral bedsheet collection", "minimal bedsheet collection", "luxury bedsheets online", "Jaipur block print collections"],
  alternates: { canonical: "https://zafiroindio.com/collections" },
};

export default function Collections() {
  return (
    <main style={{ background: "#faf8f5", minHeight: "100vh" }}>
      <style>{`
        .collectionCard {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .collectionCard:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.08) !important;
        }
        .collectionCardImg {
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .collectionCard:hover .collectionCardImg {
          transform: scale(1.06);
        }
        .collectionBtn {
          background: #a67c37;
          transition: background 0.2s ease;
        }
        .collectionBtn:hover {
          background: #8e682c !important;
        }
      `}</style>

      {/* ── Hero Banner ───────────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          background: "linear-gradient(rgba(247, 243, 237, 0.88), rgba(247, 243, 237, 0.94)), url('https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1600&q=80') center/cover no-repeat",
          padding: "70px 20px 65px",
          textAlign: "center",
          borderBottom: "1px solid #eae4d9"
        }}
      >
        <div className="container" style={{ maxWidth: 800, margin: "0 auto" }}>
          <h1
            className="serif"
            style={{
              fontSize: 42,
              fontWeight: 500,
              color: "#1c1917",
              margin: "0 0 10px",
              letterSpacing: "-0.5px"
            }}
          >
            Collections
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "#66625d",
              margin: 0,
              fontWeight: 400
            }}
          >
            Curated bedsheet collections for every style and every mood.
          </p>
        </div>
      </section>

      {/* ── Collection Grid ────────────────────────────────── */}
      <section className="section" style={{ padding: "60px 0 90px", background: "#faf8f5" }}>
        <div className="container" style={{ maxWidth: 1240 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: 28
            }}
          >
            {collections.map((c) => (
              <article
                key={c.slug}
                id={c.slug}
                className="collectionCard"
                style={{
                  background: "#ffffff",
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid #e7e1d6",
                  boxShadow: "0 4px 18px rgba(0, 0, 0, 0.03)",
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                {/* Card Image */}
                <div style={{ overflow: "hidden", height: 240, position: "relative" }}>
                  <img
                    src={c.image}
                    alt={c.name}
                    loading="lazy"
                    className="collectionCardImg"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block"
                    }}
                  />
                </div>

                {/* Card Body */}
                <div
                  style={{
                    padding: "24px 26px 28px",
                    display: "flex",
                    flexDirection: "column",
                    flex: 1
                  }}
                >
                  <h2
                    className="serif"
                    style={{
                      fontSize: 22,
                      fontWeight: 500,
                      color: "#1c1917",
                      margin: "0 0 8px"
                    }}
                  >
                    {c.name}
                  </h2>
                  <p
                    style={{
                      fontSize: 13.5,
                      color: "#57534e",
                      lineHeight: 1.55,
                      margin: "0 0 22px",
                      flex: 1
                    }}
                  >
                    {c.desc}
                  </p>
                  <div>
                    <Link
                      href={`/collections/${c.slug}`}
                      className="collectionBtn"
                      style={{
                        display: "inline-block",
                        color: "#ffffff",
                        padding: "11px 22px",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.8px",
                        textTransform: "uppercase",
                        borderRadius: 4,
                        textDecoration: "none"
                      }}
                    >
                      SHOP COLLECTION
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
