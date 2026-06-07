import { IncidentCard } from "@/components/dashboard/incident-card";
import type { IncidentPackage } from "@/lib/types";

type IncidentListProps = {
  incidentPackages: IncidentPackage[];
  selectedIncidentId: string;
  onSelect: (incidentId: string) => void;
  emptyMessage?: string | null;
};

export function IncidentList({
  incidentPackages,
  selectedIncidentId,
  onSelect,
  emptyMessage,
}: IncidentListProps) {
  return (
    <section
      className="ops-panel flex h-full min-h-0 flex-col"
      data-testid="dispatch-queue"
    >
      <div className="mb-2 flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <h2 className="ops-heading text-sm">Dispatch queue</h2>
        <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-[var(--panel-muted)] px-2 text-sm font-semibold text-slate-700">
          {incidentPackages.length}
        </span>
      </div>
      <div className="queue-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5">
        {incidentPackages.length === 0 && emptyMessage ? (
          <p
            className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm leading-6 text-slate-600"
            data-testid="dispatch-queue-empty"
          >
            {emptyMessage}
          </p>
        ) : null}
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
