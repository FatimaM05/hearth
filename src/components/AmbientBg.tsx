export default function AmbientBg() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Soft warm sand & deep forest ambient orbs */}
      <div className="animate-float-slow absolute -right-28 -top-28 size-[28rem] rounded-full bg-glow/30 blur-3xl sm:size-[36rem]" />
      <div className="animate-float-reverse absolute -left-32 top-1/3 size-[24rem] rounded-full bg-ink/[0.08] blur-3xl sm:size-[34rem]" />
      <div className="animate-float-slow absolute -bottom-36 right-1/4 size-[22rem] rounded-full bg-fog/35 blur-3xl sm:size-[30rem]" />

      {/* Subtle architectural grid & faceless minimalist curves */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.35]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hearth-grid" width="64" height="64" patternUnits="userSpaceOnUse">
            <path d="M 64 0 L 0 0 0 64" fill="none" stroke="#b9bba8" strokeWidth="0.7" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hearth-grid)" />
      </svg>

      <svg
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full opacity-55"
      >
        <path
          d="M-80 680 C 260 560, 520 790, 920 620 C 1180 510, 1340 590, 1520 510"
          stroke="#b9bba8"
          strokeWidth="1.5"
        />
        <path
          d="M-40 730 C 300 610, 580 830, 960 665 C 1220 555, 1360 630, 1520 555"
          stroke="#dcbc98"
          strokeOpacity="0.6"
          strokeWidth="1.4"
        />
        <circle cx="1210" cy="180" r="140" stroke="#b9bba8" strokeWidth="1" strokeDasharray="6 8" />
        <circle cx="1210" cy="180" r="92" stroke="#dcbc98" strokeOpacity="0.65" strokeWidth="1.2" />
      </svg>
    </div>
  );
}
