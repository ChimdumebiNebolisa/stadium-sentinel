import { PriorityBadge } from "@/components/dashboard/priority-badge";
import { getLocationRecord } from "@/lib/data";
import { getPriorityRationale } from "@/lib/priority";
import type { IncidentPackage } from "@/lib/types";

function formatZoneLayer(zoneLayer: string): string {
  switch (zoneLayer) {
    case "bowl":
      return "Stands";
    case "perimeter":
      return "Perimeter";
    case "concourse":
      return "Concourse";
    case "restricted":
      return "Restricted";
    default:
      return zoneLayer.charAt(0).toUpperCase() + zoneLayer.slice(1);
  }
}

export function IncidentDetailPanel({
  incidentPackage,
}: {
  incidentPackage: IncidentPackage;
}) {
  const { incident } = incidentPackage;
  const priority = incident.priority;
  const location = getLocationRecord(incident.locationId);
  const leadTeam = location?.defaultTeams[0] ?? incident.assignedRole;
  const riskTags = [
    location?.accessibilityCritical ? "Accessibility critical" : null,
    location?.crowdFlowCritical ? "Crowd-flow risk" : null,
  ].filter(Boolean);

  return (
    <div className="border-b border-white/8 pb-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="ops-label">Command brief</p>
          <h2
            className="mt-2 line-clamp-2 text-[22px] font-semibold leading-[1.12] tracking-[-0.02em] text-white"
            data-testid="selected-incident-title"
          >
            {incident.title}
          </h2>
        </div>
        <div className="shrink-0">
          <PriorityBadge level={priority} />
        </div>
      </div>

      <dl className="mt-4 space-y-1.5 text-[13px]">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-400">Location</dt>
          <dd className="font-medium text-white text-right">
            {location?.name ?? incident.locationLabel}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-400">Layer</dt>
          <dd className="font-medium text-white text-right">
            {location ? formatZoneLayer(location.zoneLayer) : "Unknown"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-400">Team</dt>
          <dd className="font-medium text-white text-right">
            {leadTeam || "Operations"}
          </dd>
        </div>
      </dl>

      {riskTags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {riskTags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-white/10 bg-[#11171d] px-2.5 py-1 text-[12px] font-medium text-slate-200"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3">
        <p className="ops-label">Why this priority</p>
        <p className="mt-1.5 text-[14px] leading-6 text-slate-200">
          {getPriorityRationale(incident)}
        </p>
      </div>
    </div>
  );
}
