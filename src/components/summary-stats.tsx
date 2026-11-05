import Link from "next/link";

export type SummaryStat = { label: string; value: number; href: string; tone?: "danger" | "warning" | "success" | "plain" };

const TONE = {
  danger: "text-danger",
  warning: "text-tag-ink",
  success: "text-success",
  plain: "text-ink",
};

// One summary line of counts above a table: large mono numbers with a label, separated by rules.
// A non-zero danger count is the only coloured number, so attention goes where it is needed.
export function SummaryStats({ stats, label }: { stats: SummaryStat[]; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-wrap border-y border-line">
      {stats.map((stat) => (
        <li key={stat.label} className="w-1/2 border-line sm:w-auto sm:flex-1 sm:not-last:border-r">
          <Link href={stat.href} className="group block px-4 py-3 hover:bg-brand-soft">
            <span className={`block font-mono text-3xl font-semibold leading-none ${stat.value > 0 ? TONE[stat.tone ?? "plain"] : "text-ink"}`}>
              {stat.value}
            </span>
            <span className="mt-1.5 block text-sm text-ink-muted group-hover:text-ink">{stat.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
