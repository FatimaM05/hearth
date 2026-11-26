// Placeholder bed illustration tinted with the chosen fabric colour.
// variant 0 front, 1 drawer open, 2 headboard close-up, 3 side profile, 4 bedroom at night.
type Props = { color?: string; variant?: number; className?: string };

export default function BedArt({ color = "#E8DEC6", variant = 0, className }: Props) {
  const v = ((variant % 5) + 5) % 5;
  const night = v === 4;
  const shade = "rgba(12,10,8,0.14)";
  const deepShade = "rgba(12,10,8,0.24)";
  const highlight = "rgba(255,255,255,0.22)";
  const line = "rgba(12,10,8,0.28)";

  return (
    <svg
      viewBox="0 0 600 450"
      role="img"
      aria-label="Divan bed illustration"
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Room wall & floor */}
      <rect width="600" height="450" fill={night ? "#1d2618" : "#e8e5dd"} />
      <rect y="346" width="600" height="104" fill={night ? "#0c0a08" : "#d9d5ca"} />
      <line x1="0" y1="346" x2="600" y2="346" stroke={night ? "#2a3723" : "#b9bba8"} strokeWidth="1.5" />

      {/* Subtle rug & warm bedroom wall decor */}
      <ellipse cx="300" cy="396" rx="225" ry="26" fill={night ? "#242f1e" : "#f1efe9"} />
      {!night ? (
        <g opacity="0.8">
          <rect x="44" y="64" width="76" height="96" rx="8" fill="#FFFFFF" stroke="#b9bba8" strokeWidth="2" />
          <circle cx="82" cy="102" r="16" fill="#dcbc98" opacity="0.7" />
          <path d="M58 140 Q82 114 106 140" stroke="#2a3723" strokeWidth="2" fill="none" />
          <rect x="488" y="88" width="66" height="118" rx="6" fill="#FFFFFF" stroke="#b9bba8" strokeWidth="2" />
          <line x1="521" y1="88" x2="521" y2="206" stroke="#b9bba8" strokeWidth="1.5" />
        </g>
      ) : (
        <g>
          <rect x="40" y="54" width="124" height="176" rx="10" fill="#0c0a08" stroke="#3b4c32" strokeWidth="3" />
          <circle cx="102" cy="122" r="24" fill="#dcbc98" />
          <circle cx="113" cy="114" r="22" fill="#0c0a08" />
          <rect x="498" y="252" width="52" height="94" rx="6" fill="#2a3723" />
          <path d="M510 212 h28 l6 36 h-40 z" fill="#dcbc98" opacity="0.9" />
        </g>
      )}

      <g transform={v === 2 ? "translate(-240 -116) scale(1.78)" : undefined}>
        {v === 3 ? (
          <g>
            {/* Side profile */}
            <ellipse cx="300" cy="368" rx="228" ry="9" fill={shade} />
            <rect x="86" y="132" width="28" height="178" rx="8" fill={color} />
            <rect x="86" y="132" width="28" height="178" rx="8" fill={shade} />
            {/* Mattress */}
            <rect x="102" y="252" width="414" height="52" rx="10" fill="#FFFFFF" stroke="#b9bba8" strokeWidth="1.5" />
            <path d="M112 268h394" stroke="#e8e5dd" strokeDasharray="5 5" />
            {/* Pillows & throw */}
            <rect x="114" y="226" width="94" height="32" rx="14" fill="#FFFFFF" stroke="#b9bba8" />
            <rect x="360" y="250" width="110" height="54" rx="6" fill={color} opacity="0.7" />
            {/* Upholstered base */}
            <rect x="102" y="304" width="414" height="54" rx="6" fill={color} />
            <rect x="102" y="304" width="414" height="54" rx="6" fill={shade} />
            <path d="M112 318h394" stroke={line} />
            <rect x="116" y="358" width="14" height="9" rx="2" fill="#0c0a08" />
            <rect x="488" y="358" width="14" height="9" rx="2" fill="#0c0a08" />
          </g>
        ) : (
          <g>
            {/* Contact shadow */}
            <ellipse cx="300" cy="368" rx="205" ry="10" fill={shade} />

            {/* Floor-standing channel headboard */}
            <rect x="128" y="106" width="344" height="176" rx="14" fill={color} />
            <rect x="128" y="106" width="344" height="22" rx="14" fill={highlight} />
            {Array.from({ length: 7 }).map((_, i) => (
              <rect key={i} x={152 + i * 48} y="114" width="4" height="156" rx="2" fill={deepShade} />
            ))}

            {/* Pillows & duvet */}
            <rect x="160" y="222" width="126" height="42" rx="16" fill="#FFFFFF" stroke="#b9bba8" strokeWidth="1.5" />
            <rect x="314" y="222" width="126" height="42" rx="16" fill="#FFFFFF" stroke="#b9bba8" strokeWidth="1.5" />
            <rect x="118" y="254" width="364" height="52" rx="10" fill="#FFFFFF" stroke="#b9bba8" strokeWidth="1.5" />
            <path d="M130 278h340" stroke="#e8e5dd" strokeDasharray="6 6" />
            {/* Accent throw */}
            <rect x="190" y="256" width="220" height="48" rx="6" fill={color} opacity="0.35" />

            {/* Upholstered divan base */}
            <rect x="118" y="306" width="364" height="52" rx="6" fill={color} />
            <rect x="118" y="306" width="364" height="52" rx="6" fill={shade} />
            <rect x="130" y="313" width="164" height="36" rx="4" fill="none" stroke={line} />
            <rect x="306" y="313" width="164" height="36" rx="4" fill="none" stroke={line} />
            <rect x="198" y="328" width="28" height="4" rx="2" fill={line} />
            <rect x="374" y="328" width="28" height="4" rx="2" fill={line} />

            {/* Open storage drawer variant (like reference!) */}
            {v === 1 && (
              <g>
                <rect x="136" y="330" width="154" height="40" rx="4" fill="#dcbc98" stroke="#9b7c5a" strokeWidth="1.5" />
                <rect x="142" y="334" width="142" height="16" rx="2" fill="#ead4b8" />
                <rect x="132" y="346" width="162" height="28" rx="4" fill={color} />
                <rect x="132" y="346" width="162" height="28" rx="4" fill={deepShade} />
                <rect x="194" y="357" width="38" height="4" rx="2" fill={highlight} />
              </g>
            )}

            {/* Feet */}
            <rect x="136" y="358" width="14" height="9" rx="2" fill="#0c0a08" />
            <rect x="450" y="358" width="14" height="9" rx="2" fill="#0c0a08" />
          </g>
        )}
      </g>
    </svg>
  );
}
