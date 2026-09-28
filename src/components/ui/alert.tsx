import type { ReactNode } from "react";

const TONES = {
  error: "border-danger/30 bg-danger-soft text-danger",
  success: "border-success/30 bg-success-soft text-success",
  info: "border-brand/20 bg-brand-soft text-ink",
};

export function Alert({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-md border px-4 py-3 text-sm ${TONES[tone]}`}>
      {children}
    </div>
  );
}
