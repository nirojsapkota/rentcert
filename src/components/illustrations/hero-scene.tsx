// Decorative hero scene: a gas heater, a checklist clipboard, a bell and a plant on soft blue shapes.
// Brand palette only; hidden from screen readers.
export function HeroScene({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 300" className={className} aria-hidden="true" focusable="false">
      <ellipse cx="250" cy="170" rx="170" ry="130" fill="#c7d7fb" opacity="0.55" />
      <ellipse cx="320" cy="120" rx="90" ry="90" fill="#dbe6ff" />
      {/* plant */}
      <g fill="#3f8f6b">
        <path d="M70 250c-4-34 6-62 26-80-2 30-8 56-26 80z" />
        <path d="M74 252c12-30 34-48 62-52-14 26-34 44-62 52z" opacity="0.85" />
        <path d="M72 252c-18-24-24-50-18-78 16 22 22 48 18 78z" opacity="0.7" />
      </g>
      {/* heater pipes */}
      <g stroke="#7a86a3" strokeWidth="7" strokeLinecap="round">
        <path d="M150 230v40" />
        <path d="M172 230v40" />
        <path d="M194 230v40" />
      </g>
      <g stroke="#b86b2b" strokeWidth="4" strokeLinecap="round">
        <path d="M150 262v8" />
        <path d="M194 262v8" />
      </g>
      {/* heater body */}
      <rect x="118" y="40" width="108" height="192" rx="14" fill="#ffffff" stroke="#c9d4ea" strokeWidth="2" />
      <rect x="118" y="40" width="108" height="20" rx="10" fill="#eef3fc" />
      <circle cx="172" cy="110" r="26" fill="#fff3e6" />
      <path d="M172 92c10 10 14 18 14 25a14 14 0 0 1-28 0c0-6 3-11 7-15 0 6 3 9 6 9-2-7-1-13 1-19z" fill="#f97316" />
      <path d="M172 108c4 4 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z" fill="#fdba74" />
      <rect x="150" y="168" width="44" height="18" rx="6" fill="#e6eeff" stroke="#c9d4ea" />
      <rect x="160" y="173" width="18" height="8" rx="4" fill="#0f2557" />
      {/* clipboard */}
      <g transform="rotate(4 320 150)">
        <rect x="262" y="70" width="118" height="160" rx="12" fill="#1d4ed8" />
        <rect x="272" y="84" width="98" height="136" rx="8" fill="#ffffff" />
        <rect x="300" y="60" width="42" height="20" rx="6" fill="#0f2557" />
        {[0, 1, 2, 3].map((row) => (
          <g key={row} transform={`translate(0 ${row * 30})`}>
            <path d="m284 110 6 6 10-11" fill="none" stroke="#1d4ed8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="308" y="106" width="50" height="8" rx="4" fill="#dbe6ff" />
          </g>
        ))}
      </g>
      {/* bell */}
      <g transform="translate(372 150)">
        <path d="M0-34c-16 0-26 12-26 28v14l-8 12h68l-8-12V-6c0-16-10-28-26-28z" fill="#1d4ed8" />
        <circle cx="0" cy="26" r="7" fill="#0f2557" />
        <path d="M30-40l8-10M38-24l12-4M24-52l2-12" stroke="#f5b400" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}
