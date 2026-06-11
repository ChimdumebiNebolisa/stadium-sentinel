import { PriorityBadge } from "@/components/dashboard/priority-badge";
import { getLocationRecord } from "@/lib/data";
import {
  getIncidentCompletionLabel,
  isIncidentCompleted,
} from "@/lib/incident-completion";
import type { IncidentPackage } from "@/lib/types";

type IncidentCardProps = {
  incidentPackage: IncidentPackage;
  sequenceNumber: number;
  isSelected: boolean;
  onSelect: () => void;
};

export function IncidentCard({
  incidentPackage,
  sequenceNumber,
  isSelected,
  onSelect,
}: IncidentCardProps) {
  const { incident } = incidentPackage;
  const location = getLocationRecord(incident.locationId);
  const leadTeam = location?.defaultTeams[0] ?? incident.assignedRole;
  const completionInput = { incident };
  const completed = isIncidentCompleted(completionInput);
  const completionLabel = getIncidentCompletionLabel(completionInput);
  const selectedBorder = completed
    ? "border-slate-300/60"
    : incident.priority === "Immediate"
      ? "border-rose-500/40"
      : incident.priority === "High"
        ? "border-amber-500/35"
        : incident.priority === "Moderate"
          ? "border-sky-500/35"
          : "border-slate-400/35";

  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid="incident-card"
      data-incident-id={incident.id}
      data-queue-completed={completed ? "true" : "false"}
      className={`w-full rounded-xl border px-3 py-3.5 text-left transition-colors ${
        completed
          ? isSelected
            ? "border-slate-300/70 bg-slate-50/90"
            : "border-slate-200/80 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-50"
          : isSelected
            ? `${selectedBorder} bg-[var(--panel-hover)]`
            : "border-slate-200 bg-[var(--panel-elevated)] hover:border-slate-300 hover:bg-[var(--panel-hover)]"
      }`}
    >
      <div className="flex items-start gap-4">
        <span
          className={`ops-value inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-base ${
            completed
              ? "border-slate-200 bg-slate-100 text-slate-500"
              : "border-slate-200 bg-[var(--panel-inset)] text-slate-700"
          }`}
        >
          {sequenceNumber}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3
              className={`min-w-0 flex-1 text-[1.05rem] font-semibold leading-[1.25] tracking-tight [hyphens:none] [overflow-wrap:normal] [text-wrap:wrap] [word-break:normal] ${
                completed ? "text-slate-600" : "text-[#07111c]"
              }`}
            >
              {incident.title}
            </h3>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {completionLabel ? (
                <span
                  className="inline-flex rounded-md border border-slate-300/70 bg-slate-100 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-slate-600"
                  data-testid="incident-completion-badge"
                >
                  {completionLabel}
                </span>
              ) : null}
              <PriorityBadge level={incident.priority} />
            </div>
          </div>
          <p className="mt-3 text-[0.98rem] font-medium text-slate-600">
            {leadTeam || "Operations"}
          </p>
        </div>
      </div>
    </button>
  );
}
