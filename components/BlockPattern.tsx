type Motif = "paisley" | "bloom" | "trellis" | "leaf";

function MotifShape({ motif, color }: { motif: Motif; color: string }) {
  switch (motif) {
    case "paisley":
      return (
        <path
          d="M20 4c7 0 11 6 11 12 0 5-3 8-7 10 4 1 7 4 7 8 0 6-5 10-11 10-3 0-5-1-7-3 3 3 8 3 10-1 1-3-1-5-4-6-6-2-9-6-9-12C10 12 13 4 20 4Z"
          fill={color}
        />
      );
    case "bloom":
      return (
        <g fill={color}>
          <circle cx="20" cy="20" r="3.2" />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <ellipse
              key={deg}
              cx="20"
              cy="10.5"
              rx="3.4"
              ry="6.2"
              transform={`rotate(${deg} 20 20)`}
              opacity="0.92"
            />
          ))}
        </g>
      );
    case "trellis":
      return (
        <g stroke={color} strokeWidth="2.2" fill="none" strokeLinecap="round">
          <path d="M6 6 L34 34" />
          <path d="M6 34 L34 6" />
          <circle cx="20" cy="20" r="3" fill={color} stroke="none" />
        </g>
      );
    case "leaf":
    default:
      return (
        <path
          d="M20 6c8 4 12 12 8 22-3 7-9 8-12 6 4-1 6-4 6-8-4 3-9 2-11-2-3-6 1-14 9-18Z"
          fill={color}
        />
      );
  }
}

/**
 * Renders a repeating hand-block-style print as an inline SVG pattern.
 * Used as product imagery placeholder until real product photography
 * is dropped in — swap <BlockPattern /> for a real <Image /> per product.
 */
export function BlockPattern({
  motif,
  colorway,
  className = "",
  rotate = false,
}: {
  motif: Motif;
  colorway: [string, string, string];
  className?: string;
  rotate?: boolean;
}) {
  const [ground, ink, accent] = colorway;
  const patternId = `bp-${motif}-${ink.replace("#", "")}-${accent.replace("#", "")}`;

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${motif} hand block print pattern`}
    >
      <defs>
        <pattern
          id={patternId}
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
          patternTransform={rotate ? "rotate(8)" : undefined}
        >
          <rect width="40" height="40" fill={ground} />
          <g transform="translate(0,0)">
            <MotifShape motif={motif} color={ink} />
          </g>
          <g transform="translate(20,20)">
            <MotifShape motif={motif} color={accent} />
          </g>
        </pattern>
      </defs>
      <rect width="200" height="200" fill={`url(#${patternId})`} />
    </svg>
  );
}
