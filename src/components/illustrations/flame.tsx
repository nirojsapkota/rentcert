// Decorative flame for gas check rows and cards.
export function FlameIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 80" className={className} aria-hidden="true" focusable="false">
      <ellipse cx="32" cy="74" rx="22" ry="5" fill="#dbe6ff" />
      <path d="M32 4c16 16 24 30 24 42a24 24 0 0 1-48 0c0-10 6-18 12-24 0 10 4 15 10 15-4-12-2-22 2-33z" fill="#1d4ed8" />
      <path d="M32 36c7 7 10 13 10 18a10 10 0 0 1-20 0c0-5 3-10 10-18z" fill="#93b4ff" />
    </svg>
  );
}
