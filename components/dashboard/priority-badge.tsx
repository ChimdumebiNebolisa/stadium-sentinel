import type { PriorityLevel } from "@/lib/types";

const priorityStyles: Record<PriorityLevel, string> = {
  Immediate: "border-rose-500/35 bg-rose-500/12 text-rose-200",
  High: "border-amber-500/35 bg-amber-500/12 text-amber-200",
  Moderate: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  Monitor: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

export function PriorityBadge({ level }: { level: PriorityLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-1 text-[11px] font-semibold ${priorityStyles[level]}`}
    >
      {level}
    </span>
  );
}
