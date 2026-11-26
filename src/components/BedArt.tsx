// Placeholder bed illustration tinted with the chosen fabric colour.
// variant 0 front, 1 drawer open, 2 headboard close-up, 3 side profile, 4 bedroom at night.
type Props = { color?: string; variant?: number; className?: string };

export default function BedArt({ color = "#E8DEC6", variant = 0, className }: Props) {
  const v = ((variant % 5) + 5) % 5;
  const shade = "rgba(14,22,38,0.16)";
  const line = "rgba(14,22,38,0.28)";

  return (
    <svg
      viewBox="0 0 600 450"
      role="img"
      aria-label="Divan bed illustration"
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="600" height="450" fill={v === 4 ? "#1B2640" : "#E4E8F0"} />
      <rect y="360" width="600" height="90" fill={v === 4 ? "#141C30" : "#CBD2DE"} />

      {v === 4 && (
        <g>
          <rect x="40" y="50" width="130" height="190" rx="8" fill="#0E1626" stroke="#3A4766" strokeWidth="4" />
          <circle cx="105" cy="120" r="26" fill="#F4B63F" />
          <circle cx="116" cy="112" r="24" fill="#0E1626" />
          <rect x="500" y="250" width="50" height="110" rx="4" fill="#2A3552" />
          <rect x="515" y="215" width="20" height="35" rx="4" fill="#F4B63F" opacity="0.9" />
        </g>
      )}

      <g transform={v === 2 ? "translate(-240 -126) scale(1.8)" : undefined}>
        {v === 3 ? (
          <g>
            <ellipse cx="300" cy="366" rx="230" ry="8" fill={shade} />
            <rect x="85" y="140" width="26" height="170" rx="8" fill={color} />
            <rect x="85" y="140" width="26" height="170" rx="8" fill={shade} opacity="0.5" />
            <rect x="100" y="258" width="420" height="46" rx="10" fill="#F6F7FA" stroke="#D5DCE6" />
            <rect x="110" y="236" width="100" height="30" rx="14" fill="#fff" stroke="#D5DCE6" />
            <rect x="100" y="304" width="420" height="52" rx="6" fill={color} />
            <rect x="100" y="304" width="420" height="52" rx="6" fill={shade} opacity="0.55" />
            <path d="M110 318h400" stroke={line} />
            <rect x="112" y="356" width="14" height="8" fill="#1a2233" />
            <rect x="494" y="356" width="14" height="8" fill="#1a2233" />
          </g>
        ) : (
          <g>
            <ellipse cx="300" cy="366" rx="200" ry="8" fill={shade} />
            <rect x="130" y="110" width="340" height="170" rx="14" fill={color} />
            {Array.from({ length: 7 }).map((_, i) => (
              <rect key={i} x={152 + i * 46} y="120" width="4" height="150" rx="2" fill={shade} />
            ))}
            <rect x="165" y="228" width="120" height="40" rx="16" fill="#fff" stroke="#D5DCE6" />
            <rect x="315" y="228" width="120" height="40" rx="16" fill="#fff" stroke="#D5DCE6" />
            <rect x="120" y="258" width="360" height="48" rx="10" fill="#F6F7FA" stroke="#D5DCE6" />
            <path d="M132 282h336" stroke="#D5DCE6" strokeDasharray="6 6" />
            <rect x="120" y="306" width="360" height="50" rx="6" fill={color} />
            <rect x="120" y="306" width="360" height="50" rx="6" fill={shade} opacity="0.55" />
            <rect x="132" y="314" width="160" height="34" rx="4" fill="none" stroke={line} />
            <rect x="308" y="314" width="160" height="34" rx="4" fill="none" stroke={line} />
            <rect x="200" y="328" width="24" height="4" rx="2" fill={line} />
            <rect x="376" y="328" width="24" height="4" rx="2" fill={line} />
            {v === 1 && (
              <g>
                <rect x="138" y="340" width="156" height="34" rx="4" fill={color} />
                <rect x="138" y="340" width="156" height="34" rx="4" fill={shade} />
                <rect x="190" y="354" width="52" height="5" rx="2.5" fill={line} />
              </g>
            )}
            <rect x="136" y="356" width="14" height="8" fill="#1a2233" />
            <rect x="450" y="356" width="14" height="8" fill="#1a2233" />
          </g>
        )}
      </g>
    </svg>
  );
}
