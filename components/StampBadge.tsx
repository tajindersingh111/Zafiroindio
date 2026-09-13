export function StampBadge({ className = "" }: { className?: string }) {
  const text = "HAND BLOCK PRINTED  •  JAIPUR, INDIA  •  EST. 2022  •  ";
  const chars = text.split("");
  const radius = 42;

  return (
    <div className={className} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="stamp-spin w-full h-full">
        <defs>
          <path
            id="stamp-circle"
            d={`M 50 50 m -${radius} 0 a ${radius} ${radius} 0 1 1 ${radius * 2} 0 a ${radius} ${radius} 0 1 1 -${radius * 2} 0`}
          />
        </defs>
        <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
        <text fontSize="7.3" letterSpacing="0.5" fill="currentColor">
          <textPath href="#stamp-circle" startOffset="0%">
            {text}
          </textPath>
        </text>
      </svg>
    </div>
  );
}
