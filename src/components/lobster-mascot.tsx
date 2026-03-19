export function LobsterMascot({
  className = "",
  flipped = false,
}: {
  className?: string;
  flipped?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 320 260"
      aria-hidden="true"
      className={className}
      style={{ transform: flipped ? "scaleX(-1)" : undefined }}
    >
      <defs>
        <linearGradient id="shell" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#ff8b52" />
          <stop offset="100%" stopColor="#d74f26" />
        </linearGradient>
        <linearGradient id="sea" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#dcf5ff" />
          <stop offset="100%" stopColor="#91d1ea" />
        </linearGradient>
      </defs>

      <rect x="0" y="150" width="320" height="110" rx="28" fill="url(#sea)" />
      <circle cx="90" cy="58" r="18" fill="#ffe7a7" opacity="0.9" />

      <path
        d="M88 160c-22-14-36-34-42-58 24 3 44 16 58 39"
        fill="none"
        stroke="#d74f26"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M228 160c22-14 36-34 42-58-24 3-44 16-58 39"
        fill="none"
        stroke="#d74f26"
        strokeWidth="10"
        strokeLinecap="round"
      />

      <path d="M104 110c-24-18-32-42-25-60 29 5 47 24 54 51" fill="url(#shell)" />
      <path d="M216 110c24-18 32-42 25-60-29 5-47 24-54 51" fill="url(#shell)" />
      <circle cx="110" cy="107" r="11" fill="#fff4ea" />
      <circle cx="210" cy="107" r="11" fill="#fff4ea" />

      <path
        d="M160 66c-44 0-78 34-78 76s34 72 78 72 78-30 78-72-34-76-78-76Z"
        fill="url(#shell)"
      />
      <path
        d="M130 118c18-12 42-17 62-10"
        fill="none"
        stroke="#b63d18"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M124 146c21 10 48 10 72 0"
        fill="none"
        stroke="#b63d18"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M132 173c18 7 38 7 56 0"
        fill="none"
        stroke="#b63d18"
        strokeWidth="8"
        strokeLinecap="round"
      />

      <circle cx="145" cy="100" r="9" fill="#fff" />
      <circle cx="175" cy="100" r="9" fill="#fff" />
      <circle cx="146" cy="102" r="4" fill="#202020" />
      <circle cx="176" cy="102" r="4" fill="#202020" />
      <path
        d="M145 122c10 7 20 7 30 0"
        fill="none"
        stroke="#672717"
        strokeWidth="5"
        strokeLinecap="round"
      />

      <path
        d="M124 198c-10 18-23 30-38 36"
        fill="none"
        stroke="#d74f26"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M148 205c-10 16-19 28-31 38"
        fill="none"
        stroke="#d74f26"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M196 205c10 16 19 28 31 38"
        fill="none"
        stroke="#d74f26"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M220 198c10 18 23 30 38 36"
        fill="none"
        stroke="#d74f26"
        strokeWidth="10"
        strokeLinecap="round"
      />

      <path
        d="M75 196c22-11 36-28 38-50-19 5-35 15-50 32"
        fill="#ff9e66"
        opacity="0.6"
      />
      <path
        d="M245 196c-22-11-36-28-38-50 19 5 35 15 50 32"
        fill="#ff9e66"
        opacity="0.6"
      />
    </svg>
  );
}
