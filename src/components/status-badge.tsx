import type { ScheduleStatus } from "@/server/compliance/status";

// Icon + text + colour, so status never depends on colour alone.
const STYLES: Record<ScheduleStatus, { icon: string; className: string; name: string }> = {
  overdue: { icon: "!", className: "border-danger/40 bg-danger-soft text-danger", name: "Overdue" },
  due: { icon: "●", className: "border-warning/40 bg-warning-soft text-warning", name: "Due today" },
  due_soon: { icon: "◔", className: "border-warning/40 bg-warning-soft text-warning", name: "Due soon" },
  upcoming: { icon: "✓", className: "border-success/40 bg-success-soft text-success", name: "Up to date" },
  not_applicable: { icon: "–", className: "border-line bg-canvas text-ink-muted", name: "Not applicable" },
  not_set_up: { icon: "?", className: "border-line bg-canvas text-ink-muted", name: "Not set up" },
};

export function statusName(status: ScheduleStatus): string {
  return STYLES[status].name;
}

export function StatusBadge({ status, label }: { status: ScheduleStatus; label?: string }) {
  const style = STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-medium ${style.className}`}>
      <span aria-hidden="true" className="font-bold">
        {style.icon}
      </span>
      {label ?? style.name}
    </span>
  );
}
