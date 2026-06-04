import { PriorityBadge } from "@/components/dashboard/priority-badge";
import {
  getAssignmentStatus,
  getPriorityRationale,
  getPrioritySummary,
} from "@/lib/priority";
import type { IncidentPackage } from "@/lib/types";

export function IncidentDetailPanel({
  incidentPackage,
}: {
  incidentPackage: IncidentPackage;
}) {
  const { incident } = incidentPackage;
  const priority = incident.priority;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="ops-label">Command brief</p>
          <h2 className="ops-heading mt-1 text-xl">{incident.title}</h2>
          <p className="mt-1 text-sm text-slate-400">{incident.locationLabel}</p>
        </div>
        <PriorityBadge level={priority} />
      </div>
      <p className="mt-3 max-w-[68ch] text-sm leading-6 text-slate-200">
        {getPriorityRationale(incident)}
      </p>
      <div className="ops-subpanel mt-4 px-4 py-3">
        <p className="text-sm font-semibold text-white">{getAssignmentStatus(incident)}</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          {getPrioritySummary(incident)}
        </p>
      </div>
    </div>
  );
}
