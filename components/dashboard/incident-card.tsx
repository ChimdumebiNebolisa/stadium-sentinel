import { PriorityBadge } from "@/components/dashboard/priority-badge";
import { getAssignmentStatus } from "@/lib/priority";
import type { IncidentPackage } from "@/lib/types";

type IncidentCardProps = {
  incidentPackage: IncidentPackage;
  isSelected: boolean;
  onSelect: () => void;
};

export function IncidentCard({
  incidentPackage,
  isSelected,
  onSelect,
}: IncidentCardProps) {
  const { incident } = incidentPackage;

  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid="incident-card"
      className={`w-full border px-3.5 py-3 text-left transition-colors ${
        isSelected
          ? "border-amber-500/45 bg-[#1a2027]"
          : "border-white/8 bg-[#141920] hover:border-white/20 hover:bg-[#171d24]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ops-subheading">{incident.locationLabel}</p>
          <h3 className="mt-1 text-base font-semibold text-white">
            {incident.title}
          </h3>
        </div>
        <PriorityBadge level={incident.priority} />
      </div>
      <p className="mt-2 text-sm text-slate-300">{getAssignmentStatus(incident)}</p>
    </button>
  );
}
