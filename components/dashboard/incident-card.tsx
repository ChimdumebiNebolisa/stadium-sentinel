import { PriorityBadge } from "@/components/dashboard/priority-badge";
import { getLocationRecord } from "@/lib/data";
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
  const selectedBorder =
    incident.priority === "Immediate"
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
      className={`w-full rounded-xl border px-3 py-3.5 text-left transition-colors ${
        isSelected
          ? `${selectedBorder} bg-[var(--panel-hover)]`
          : "border-slate-200 bg-[var(--panel-elevated)] hover:border-slate-300 hover:bg-[var(--panel-hover)]"
      }`}
    >
      <div className="flex items-start gap-4">
        <span className="ops-value inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-[var(--panel-inset)] text-base text-slate-700">
          {sequenceNumber}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 text-[1.05rem] font-semibold leading-[1.25] tracking-tight text-[#07111c] [word-break:normal] [overflow-wrap:break-word]">
              {incident.title}
            </h3>
            <PriorityBadge level={incident.priority} />
          </div>
          <p className="mt-3 text-[0.98rem] font-medium text-slate-600">
            {leadTeam || "Operations"}
          </p>
        </div>
      </div>
    </button>
  );
}
