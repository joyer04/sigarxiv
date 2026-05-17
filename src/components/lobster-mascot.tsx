export function LobsterMascot({
  className = "",
  flipped = false,
}: {
  className?: string;
  flipped?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 240 270"
      aria-hidden="true"
      className={className}
      style={{ transform: flipped ? "scaleX(-1)" : undefined }}
    >
      <defs>
        <radialGradient id="body" cx="42%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#ffcfa0" />
          <stop offset="55%" stopColor="#ff8c4a" />
          <stop offset="100%" stopColor="#e85c20" />
        </radialGradient>
        <radialGradient id="claw" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ffa96a" />
          <stop offset="100%" stopColor="#e05525" />
        </radialGradient>
        <radialGradient id="belly" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#ffe8cb" />
          <stop offset="100%" stopColor="#ffbc85" />
        </radialGradient>
        <linearGradient id="sea" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#d0f0ff" />
          <stop offset="100%" stopColor="#8fd4ed" />
        </linearGradient>
      </defs>

      {/* ocean background */}
      <ellipse cx="120" cy="242" rx="96" ry="26" fill="url(#sea)" />

      {/* tail fan — 3 cute rounded petals */}
      <ellipse cx="96"  cy="208" rx="13" ry="22" fill="#e85c20" opacity="0.85" transform="rotate(-18 96 208)" />
      <ellipse cx="120" cy="214" rx="14" ry="24" fill="#e85c20" opacity="0.9" />
      <ellipse cx="144" cy="208" rx="13" ry="22" fill="#e85c20" opacity="0.85" transform="rotate(18 144 208)" />
      {/* petal highlights */}
      <ellipse cx="96"  cy="205" rx="5"  ry="9"  fill="#ffaa70" opacity="0.5" transform="rotate(-18 96 208)" />
      <ellipse cx="120" cy="211" rx="5"  ry="10" fill="#ffaa70" opacity="0.5" />
      <ellipse cx="144" cy="205" rx="5"  ry="9"  fill="#ffaa70" opacity="0.5" transform="rotate(18 144 208)" />

      {/* short stubby legs — 3 per side, very small */}
      {/* left legs */}
      <line x1="70"  y1="185" x2="50"  y2="208" stroke="#d04e18" strokeWidth="7"  strokeLinecap="round" />
      <line x1="84"  y1="192" x2="68"  y2="217" stroke="#d04e18" strokeWidth="7"  strokeLinecap="round" />
      <line x1="100" y1="196" x2="88"  y2="222" stroke="#d04e18" strokeWidth="7"  strokeLinecap="round" />
      {/* right legs */}
      <line x1="170" y1="185" x2="190" y2="208" stroke="#d04e18" strokeWidth="7"  strokeLinecap="round" />
      <line x1="156" y1="192" x2="172" y2="217" stroke="#d04e18" strokeWidth="7"  strokeLinecap="round" />
      <line x1="140" y1="196" x2="152" y2="222" stroke="#d04e18" strokeWidth="7"  strokeLinecap="round" />

      {/* body — chubby, round, no segments */}
      <ellipse cx="120" cy="155" rx="68" ry="62" fill="url(#body)" />

      {/* belly highlight */}
      <ellipse cx="120" cy="160" rx="38" ry="34" fill="url(#belly)" opacity="0.55" />

      {/* 2 gentle shell ridges (subtle, not insect-y) */}
      <path d="M96 128 Q120 122 144 128" fill="none" stroke="#c84a10" strokeWidth="3.5" strokeLinecap="round" opacity="0.45" />
      <path d="M88 148 Q120 140 152 148" fill="none" stroke="#c84a10" strokeWidth="3.5" strokeLinecap="round" opacity="0.45" />

      {/* ── LEFT CLAW (round mitten style) ── */}
      <circle cx="40"  cy="148" r="28" fill="url(#claw)" />
      <circle cx="32"  cy="130" r="17" fill="#ff9a55" />
      <circle cx="56"  cy="126" r="17" fill="#ff9a55" />
      {/* claw arm */}
      <path d="M72 158 Q56 152 46 148" fill="none" stroke="#e06530" strokeWidth="12" strokeLinecap="round" />
      {/* claw highlight */}
      <circle cx="36"  cy="143" r="8"  fill="#ffcb96" opacity="0.55" />

      {/* ── RIGHT CLAW ── */}
      <circle cx="200" cy="148" r="28" fill="url(#claw)" />
      <circle cx="208" cy="130" r="17" fill="#ff9a55" />
      <circle cx="184" cy="126" r="17" fill="#ff9a55" />
      <path d="M168 158 Q184 152 194 148" fill="none" stroke="#e06530" strokeWidth="12" strokeLinecap="round" />
      <circle cx="204" cy="143" r="8"  fill="#ffcb96" opacity="0.55" />

      {/* ── FACE ── */}

      {/* antennae — short, bobbly */}
      <path d="M102 102 Q90 76 80 58"  fill="none" stroke="#d04e18" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M138 102 Q150 76 160 58" fill="none" stroke="#d04e18" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="80"  cy="55" r="9" fill="#ff7a38" />
      <circle cx="160" cy="55" r="9" fill="#ff7a38" />
      <circle cx="80"  cy="52" r="4" fill="#ffb880" opacity="0.7" />
      <circle cx="160" cy="52" r="4" fill="#ffb880" opacity="0.7" />

      {/* big cute eyes */}
      <circle cx="97"  cy="128" r="19" fill="white" />
      <circle cx="143" cy="128" r="19" fill="white" />
      {/* pupils */}
      <circle cx="100" cy="131" r="11" fill="#1e1008" />
      <circle cx="146" cy="131" r="11" fill="#1e1008" />
      {/* iris color ring */}
      <circle cx="100" cy="131" r="8"  fill="#4a2800" />
      <circle cx="146" cy="131" r="8"  fill="#4a2800" />
      {/* primary shine */}
      <circle cx="106" cy="124" r="5"  fill="white" />
      <circle cx="152" cy="124" r="5"  fill="white" />
      {/* secondary mini shine */}
      <circle cx="96"  cy="134" r="2.5" fill="white" opacity="0.7" />
      <circle cx="142" cy="134" r="2.5" fill="white" opacity="0.7" />

      {/* rosy cheeks */}
      <circle cx="76"  cy="148" r="14" fill="#ffaaaa" opacity="0.38" />
      <circle cx="164" cy="148" r="14" fill="#ffaaaa" opacity="0.38" />

      {/* happy wide smile */}
      <path
        d="M100 152 Q120 170 140 152"
        fill="none"
        stroke="#c03a10"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* tiny inner smile shine */}
      <path
        d="M107 153 Q120 162 133 153"
        fill="none"
        stroke="#e8926a"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}
