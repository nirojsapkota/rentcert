import type { ScheduleStatus } from "@/server/compliance/status";

// A soft pill: icon + text + colour, so status never depends on colour alone.
const STYLES: Record<ScheduleStatus, { icon: string; className: string; name: string }> = {
  overdue: { icon: "!", className: "bg-danger-soft text-danger", name: "Overdue" },
  due: { icon: "●", className: "bg-warning-soft text-warning", name: "Due today" },
  due_soon: { icon: "◔", className: "bg-warning-soft text-warning", name: "Due soon" },
  upcoming: { icon: "✓", className: "bg-success-soft text-success", name: "Up to date" },
  not_applicable: { icon: "–", className: "bg-brand-soft text-ink-muted", name: "Not applicable" },
  not_set_up: { icon: "?", className: "bg-brand-soft text-ink-muted", name: "Not set up" },
};

export function statusName(status: ScheduleStatus): string {
  return STYLES[status].name;
}

export function StatusBadge({ status, label }: { status: ScheduleStatus; label?: string }) {
  const style = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs leading-none font-semibold whitespace-nowrap ${style.className}`}
    >
      <span aria-hidden="true">{style.icon}</span>
      {label ?? style.name}
    </span>
  );
}
