import type { PriorityLevel } from "@/lib/types";

type CommandHeaderProps = {
  incidentCount: number;
  topPriority: PriorityLevel;
};

export function CommandHeader({ incidentCount, topPriority }: CommandHeaderProps) {
  return (
    <header className="ops-panel flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-base font-semibold text-white">Stadium Sentinel</span>
        <span className="text-sm text-slate-400">Riverside Stadium</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Live operations
        </span>
      </div>
      <div className="flex flex-wrap items-stretch gap-2">
        <div className="ops-subpanel px-3 py-2">
          <p className="ops-label">Open incidents</p>
          <p className="ops-value mt-0.5 text-lg text-white">{incidentCount}</p>
        </div>
        <div className="ops-subpanel px-3 py-2">
          <p className="ops-label">Priority order</p>
          <p className="mt-0.5 text-sm font-semibold text-amber-200">
            {topPriority} response
          </p>
        </div>
      </div>
    </header>
  );
}
