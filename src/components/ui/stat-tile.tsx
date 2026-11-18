import type { ReactNode } from "react";
import Link from "next/link";

const TONES = {
  blue: { tile: "bg-tile-blue border-brand/15", icon: "bg-brand text-white", value: "text-ink" },
  green: { tile: "bg-tile-green border-success/15", icon: "bg-success text-white", value: "text-ink" },
  violet: { tile: "bg-tile-violet border-tile-violet-ink/15", icon: "bg-tile-violet-ink text-white", value: "text-ink" },
  amber: { tile: "bg-tile-amber border-warning/15", icon: "bg-warning text-white", value: "text-ink" },
  danger: { tile: "bg-danger-soft border-danger/20", icon: "bg-danger text-white", value: "text-danger" },
};

export type StatTileTone = keyof typeof TONES;

// A tinted tile: icon in a rounded square, a large number and a label. The whole tile is a link.
export function StatTile({
  href,
  value,
  label,
  detail,
  icon,
  tone = "blue",
}: {
  href: string;
  value: ReactNode;
  label: string;
  detail?: string;
  icon: ReactNode;
  tone?: StatTileTone;
}) {
  const style = TONES[tone];
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 rounded-xl border p-4 transition-shadow hover:shadow-md ${style.tile}`}
    >
      <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${style.icon} [&>svg]:h-6 [&>svg]:w-6`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className={`block text-3xl leading-none font-extrabold tabular-nums ${style.value}`}>{value}</span>
        <span className="mt-1 block text-sm font-medium text-ink">{label}</span>
        {detail && <span className="block text-xs text-ink-muted">{detail}</span>}
      </span>
    </Link>
  );
}
