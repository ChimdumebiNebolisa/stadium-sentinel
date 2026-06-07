import type { PriorityLevel } from "@/lib/types";

const priorityStyles: Record<PriorityLevel, string> = {
  Immediate: "border-rose-500/35 bg-rose-500/12 text-rose-800",
  High: "border-amber-500/35 bg-amber-500/12 text-amber-900",
  Moderate: "border-sky-500/30 bg-sky-500/10 text-sky-800",
  Monitor: "border-slate-400/30 bg-slate-400/10 text-slate-600",
};

export function PriorityBadge({ level }: { level: PriorityLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.06em] ${priorityStyles[level]}`}
    >
      {level}
    </span>
  );
}
