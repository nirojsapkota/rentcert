import type { ReactNode } from "react";
import { StatTile, type StatTileTone } from "@/components/ui/stat-tile";

export type SummaryStat = {
  label: string;
  value: number;
  href: string;
  icon: ReactNode;
  tone?: "danger" | "warning" | "success" | "plain";
};

// Danger only turns red when there is something overdue, so attention goes where it is needed.
function tileTone(stat: SummaryStat): StatTileTone {
  switch (stat.tone) {
    case "danger":
      return stat.value > 0 ? "danger" : "violet";
    case "warning":
      return "amber";
    case "success":
      return "green";
    default:
      return "blue";
  }
}

// A row of tinted stat tiles with icons. Kept as a list so screen readers hear the count of items.
export function SummaryStats({ stats, label }: { stats: SummaryStat[]; label: string }) {
  return (
    <ul aria-label={label} className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {stats.map((stat) => (
        <li key={stat.label} className="min-w-0">
          <StatTile href={stat.href} value={stat.value} label={stat.label} icon={stat.icon} tone={tileTone(stat)} />
        </li>
      ))}
    </ul>
  );
}
