import type { ScheduleStatus } from "@/server/compliance/status";

// A service-tag stamp: icon + text + colour, so status never depends on colour alone.
// The text stays a normal sentence; CSS uppercases it, so screen readers still hear plain words.
const STYLES: Record<ScheduleStatus, { icon: string; className: string; name: string }> = {
  overdue: { icon: "!", className: "border-danger text-danger bg-surface", name: "Overdue" },
  due: { icon: "●", className: "border-[#d9b21a] bg-tag-soft text-tag-ink", name: "Due today" },
  due_soon: { icon: "◔", className: "border-[#d9b21a] bg-tag-soft text-tag-ink", name: "Due soon" },
  upcoming: { icon: "✓", className: "border-success text-success bg-surface", name: "Up to date" },
  not_applicable: { icon: "–", className: "border-line-strong text-ink-muted bg-surface", name: "Not applicable" },
  not_set_up: { icon: "?", className: "border-line-strong text-ink-muted bg-surface", name: "Not set up" },
};

export function statusName(status: ScheduleStatus): string {
  return STYLES[status].name;
}

export function StatusBadge({ status, label }: { status: ScheduleStatus; label?: string }) {
  const style = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[0.75rem] leading-none font-semibold tracking-[0.04em] whitespace-nowrap uppercase ${style.className}`}
    >
      <span aria-hidden="true">{style.icon}</span>
      {label ?? style.name}
    </span>
  );
}
