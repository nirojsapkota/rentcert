import type { ReactNode } from "react";

// A leading rule in the tone colour on a light tint: reads as a notice, not as another card.
const TONES = {
  error: "border-danger bg-danger-soft text-danger",
  success: "border-success bg-success-soft text-success",
  info: "border-ink bg-brand-soft text-ink",
};

export function Alert({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`border-l-[3px] px-4 py-3 text-sm ${TONES[tone]}`}>
      {children}
    </div>
  );
}
