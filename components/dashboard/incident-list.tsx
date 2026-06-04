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
    <section className="ops-panel h-full">
      <div className="mb-3">
        <h2 className="ops-heading">Dispatch order</h2>
        <p className="mt-1 text-sm leading-6 text-slate-300">
          Immediate incidents stay at the top so staff can move from location to next action without re-sorting the queue.
        </p>
      </div>
      <div className="space-y-2.5">
        {incidentPackages.map((incidentPackage) => (
          <IncidentCard
            key={incidentPackage.incident.id}
            incidentPackage={incidentPackage}
            isSelected={incidentPackage.incident.id === selectedIncidentId}
            onSelect={() => onSelect(incidentPackage.incident.id)}
          />
        ))}
      </div>
    </section>
  );
}
