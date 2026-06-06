import { PriorityBadge } from "@/components/dashboard/priority-badge";
import { getLocationRecord } from "@/lib/data";
import type { IncidentPackage } from "@/lib/types";

type IncidentCardProps = {
  incidentPackage: IncidentPackage;
  sequenceNumber: number;
  isSelected: boolean;
  onSelect: () => void;
};

function getQueueTitle(incident: IncidentPackage["incident"]): string {
  switch (incident.incidentType) {
    case "accessibility-assist":
      return "Section 112 assist";
    case "facility-outage":
      return "Elevator 4 down";
    case "queue-congestion":
      return "Gate B backed up";
    default:
      return incident.title;
  }
}

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
          : "border-slate-500/35";

  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid="incident-card"
      data-incident-id={incident.id}
      className={`w-full rounded-xl border px-4 py-5 text-left transition-colors ${
        isSelected
          ? `${selectedBorder} bg-[#101a25]`
          : "border-white/8 bg-[#0d1722] hover:border-white/14 hover:bg-[#101a25]"
      }`}
    >
      <div className="flex items-start gap-4">
        <span className="ops-value inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#07111c] text-base text-slate-100">
          {sequenceNumber}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[1.05rem] font-semibold leading-[1.25] tracking-tight text-white">
              {getQueueTitle(incident)}
            </h3>
            <PriorityBadge level={incident.priority} />
          </div>
          <p className="mt-3 text-[0.98rem] font-medium text-slate-300">
            {leadTeam || "Operations"}
          </p>
        </div>
      </div>
    </button>
  );
}
