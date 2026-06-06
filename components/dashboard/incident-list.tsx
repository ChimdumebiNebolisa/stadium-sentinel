import { IncidentCard } from "@/components/dashboard/incident-card";
import type { IncidentPackage } from "@/lib/types";

type IncidentListProps = {
  incidentPackages: IncidentPackage[];
  selectedIncidentId: string;
  onSelect: (incidentId: string) => void;
};

export function IncidentList({
  incidentPackages,
  selectedIncidentId,
  onSelect,
}: IncidentListProps) {
  return (
    <section className="ops-panel flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/8 pb-3">
        <h2 className="ops-heading">Dispatch queue</h2>
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#1a232c] px-2 text-xs font-semibold text-slate-300">
          {incidentPackages.length}
        </span>
      </div>
      <div className="queue-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
        {incidentPackages.map((incidentPackage, index) => (
          <IncidentCard
            key={incidentPackage.incident.id}
            incidentPackage={incidentPackage}
            sequenceNumber={index + 1}
            isSelected={incidentPackage.incident.id === selectedIncidentId}
            onSelect={() => onSelect(incidentPackage.incident.id)}
          />
        ))}
      </div>
    </section>
  );
}
