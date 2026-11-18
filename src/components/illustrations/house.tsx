// Decorative house: sidebar footer, property thumbnails and empty states. `tint` varies the walls.
const TINTS = ["#dbe6ff", "#e9f8ee", "#f0edff", "#fff6dc"] as const;

export function HouseIllustration({ className = "", tint = 0, night = false }: { className?: string; tint?: number; night?: boolean }) {
  const wall = night ? "#1e3a7a" : TINTS[Math.abs(tint) % TINTS.length];
  const roof = night ? "#0b1b45" : "#1d4ed8";
  const window = night ? "#fbbf24" : "#ffffff";
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden="true" focusable="false">
      {!night && <rect width="120" height="90" rx="10" fill="#f4f7fd" />}
      <ellipse cx="22" cy="70" rx="12" ry="18" fill={night ? "#163066" : "#bfe3cf"} />
      <ellipse cx="100" cy="68" rx="10" ry="16" fill={night ? "#163066" : "#bfe3cf"} />
      <path d="M30 44 60 20l30 24v36H30z" fill={wall} />
      <path d="M24 46 60 16l36 30-4 4-32-26-32 26z" fill={roof} />
      <rect x="72" y="22" width="8" height="14" fill={roof} />
      <rect x="38" y="50" width="12" height="12" rx="2" fill={window} />
      <rect x="70" y="50" width="12" height="12" rx="2" fill={window} />
      <rect x="54" y="58" width="12" height="22" rx="2" fill={roof} />
      <rect x="10" y="79" width="100" height="3" rx="1.5" fill={night ? "#163066" : "#c9d4ea"} />
    </svg>
  );
}
