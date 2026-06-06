import type { PriorityLevel } from "@/lib/types";

type CommandHeaderProps = {
  incidentCount: number;
  topPriority: PriorityLevel;
};

const priorityTone: Record<PriorityLevel, string> = {
  Immediate: "text-rose-300",
  High: "text-amber-200",
  Moderate: "text-sky-200",
  Monitor: "text-slate-300",
};

export function CommandHeader({ incidentCount, topPriority }: CommandHeaderProps) {
  return (
    <header
      className="ops-panel ops-strip flex min-h-[4.5rem] items-center justify-between gap-4"
      data-testid="command-bar"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="text-[1.05rem] font-semibold tracking-tight text-white">
          Stadium Sentinel
        </span>
        <span className="hidden text-slate-700 md:inline">|</span>
        <span className="text-sm text-slate-400">Riverside Stadium</span>
        <span className="hidden text-slate-700 md:inline">|</span>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Live operations
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-4 text-sm">
        <span className="hidden text-slate-700 lg:inline">|</span>
        <span className="text-slate-200">{incidentCount} Open incidents</span>
        <span className="hidden text-slate-700 lg:inline">|</span>
        <span className="text-slate-400">
          Priority:{" "}
          <span className={`font-semibold ${priorityTone[topPriority]}`}>
            {topPriority}
          </span>
        </span>
      </div>
    </header>
  );
}
