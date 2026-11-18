import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";

// A soft tint with an icon, so the tone never depends on colour alone.
const TONES = {
  error: { className: "border-danger/25 bg-danger-soft text-danger", Icon: CircleAlert },
  success: { className: "border-success/25 bg-success-soft text-success", Icon: CircleCheck },
  info: { className: "border-brand/20 bg-brand-soft text-ink", Icon: Info },
};

export function Alert({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  const { className, Icon } = TONES[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-3 rounded-lg border px-4 py-3 text-sm ${className}`}>
      <Icon aria-hidden="true" className="mt-px h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
