import type { StoryParts } from "@/lib/storefront/description";

/**
 * The product description, laid out as an editorial "story": title and opening on the left,
 * the highlights as a numbered list on the right, closing note underneath.
 */
export default function ProductStory({ story, fallbackTitle }: { story: StoryParts; fallbackTitle: string }) {
  const highlights = story.groups.flatMap((g) => g.items);
  if (!story.intro.length && !highlights.length && !story.closing.length) return null;
  // Numbering runs on across groups: where each group's first item starts.
  const starts = story.groups.map((_, gi) => story.groups.slice(0, gi).reduce((sum, g) => sum + g.items.length, 0));

  return (
    <section className="pdp-story" aria-labelledby="pdp-story-title">
      <div className="pdp-story-head">
        <p className="eyebrow">The Story</p>
        <h2 id="pdp-story-title" className="serif">{story.title || fallbackTitle}</h2>
        {story.intro.map((p, i) => (
          <p key={i} className={i === 0 ? "pdp-story-lede" : "pdp-story-p"}>{p}</p>
        ))}
        <div className="pdp-story-seal" aria-hidden="true">
          <span>Zafiro</span>
          <i />
          <span>Jaipur</span>
        </div>
      </div>

      {highlights.length > 0 && (
        <div className="pdp-story-list">
          {story.groups.map((g, gi) => (
            <div key={gi} className="pdp-story-group">
              {g.heading && story.groups.length > 1 && <h3>{g.heading}</h3>}
              <ol>
                {g.items.map((h, i) => {
                  return (
                    <li key={i}>
                      <span className="pdp-story-num serif">{String(starts[gi] + i + 1).padStart(2, "0")}</span>
                      <div>
                        {h.label && <strong>{h.label}</strong>}
                        <p>{h.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      )}

      {story.closing.length > 0 && (
        <div className="pdp-story-closing">
          {story.closing.map((b, i) =>
            b.kind === "heading" ? <h3 key={i} className="serif">{b.text}</h3> : <p key={i}>{b.text}</p>
          )}
        </div>
      )}
    </section>
  );
}
