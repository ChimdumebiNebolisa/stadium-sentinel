import { OperationsTimeline } from "@/components/dashboard/operations-timeline";
import { PriorityBadge } from "@/components/dashboard/priority-badge";
import { VenueContextCard } from "@/components/dashboard/venue-context-card";
import { WorkflowCues } from "@/components/dashboard/workflow-cues";
import { getLocationRecord } from "@/lib/data";
import type { CommandState } from "@/lib/sentinel-command-agent";
import type { IncidentPackage, TimelineEntry } from "@/lib/types";

type ActiveIncidentWorkspaceProps = {
  incidentPackage: IncidentPackage;
  commandState: CommandState;
  timeline: TimelineEntry[];
  activeLocationIds?: string[];
  transcriptLine?: string | null;
  onApprove: (incidentId: string, action: string, actionIndex: number) => void;
};

type WorkspaceCopy = {
  actionLabels: [string, string, string];
  checklist: [string, string, string];
  riskTags: string[];
  teamName: string;
  teamLabel: string;
  teamStatus: string;
  teamButtonLabel: string;
};

const WORKSPACE_COPY: Record<string, WorkspaceCopy> = {
  "incident-section-112": {
    actionLabels: ["Dispatch Guest Services", "Route details", "Radio handoff"],
    checklist: [
      "Acknowledge and assess",
      "Dispatch Guest Services",
      "Escort and resolve",
    ],
    riskTags: ["Accessibility assist", "Crowd-flow risk"],
    teamName: "Guest Services",
    teamLabel: "Primary team",
    teamStatus: "2 staff | 2 min ETA",
    teamButtonLabel: "Dispatch team",
  },
  "incident-elevator-4": {
    actionLabels: ["Send Facilities", "Accessible reroute", "Ops update"],
    checklist: [
      "Acknowledge outage",
      "Dispatch Facilities",
      "Confirm reroute coverage",
    ],
    riskTags: ["Accessibility assist", "Vertical access risk"],
    teamName: "Facilities",
    teamLabel: "Primary team",
    teamStatus: "2 staff | 4 min ETA",
    teamButtonLabel: "Dispatch team",
  },
  "incident-gate-b": {
    actionLabels: ["Dispatch Security", "Queue routing", "Gate advisory"],
    checklist: [
      "Assess crowd pressure",
      "Dispatch Security",
      "Open relief routing",
    ],
    riskTags: ["Crowd-flow risk", "Ingress delay"],
    teamName: "Security",
    teamLabel: "Primary team",
    teamStatus: "3 staff | 3 min ETA",
    teamButtonLabel: "Dispatch team",
  },
};

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

function getChecklistStatus(approvedActionCount: number, index: number) {
  if (index < approvedActionCount) {
    return {
      label: "Complete",
      badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800",
      markerClass: "bg-emerald-500 text-white",
    };
  }

  if (index === approvedActionCount) {
    return {
      label: "In progress",
      badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-800",
      markerClass: "bg-rose-500 text-white",
    };
  }

  return {
    label: "Pending",
    badgeClass: "border-slate-200 bg-slate-50 text-slate-500",
    markerClass: "bg-slate-200 text-slate-600",
  };
}

function getFallbackWorkspaceCopy(incidentPackage: IncidentPackage): WorkspaceCopy {
  const teamName = incidentPackage.incident.assignedRole || "Operations";
  const actions = incidentPackage.incident.recommendedActions;

  const actionLabels: [string, string, string] = [
    actions[0] ?? "Dispatch team",
    actions[1] ?? "Route details",
    actions[2] ?? "Radio handoff",
  ];

  const checklist: [string, string, string] =
    actions.length >= 3
      ? [actions[0], actions[1], actions[2]]
      : ["Acknowledge", "Dispatch team", "Resolve incident"];

  return {
    actionLabels,
    checklist,
    riskTags: [],
    teamName,
    teamLabel: "Primary team",
    teamStatus: "Awaiting ETA",
    teamButtonLabel: "Dispatch team",
  };
}

function WorkspaceSectionTitle({
  marker,
  title,
}: {
  marker: string;
  title: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600/85 text-xs font-semibold text-white">
        {marker}
      </span>
      <h3 className="text-sm font-semibold tracking-tight text-[#07111c]">{title}</h3>
    </div>
  );
}

export function ActiveIncidentWorkspace({
  incidentPackage,
  commandState,
  timeline,
  onApprove,
}: ActiveIncidentWorkspaceProps) {
  const { incident } = incidentPackage;
  const location = getLocationRecord(incident.locationId);
  const copy = WORKSPACE_COPY[incident.id] ?? getFallbackWorkspaceCopy(incidentPackage);
  const teamName = location?.defaultTeams[0] ?? copy.teamName;
  const primaryAction = incident.recommendedActions[0];
  const secondaryActions = incident.recommendedActions.slice(1, 3);
  const approvedActionCount = incident.approvedActionIds.length;
  const dispatchApproved = incident.approvedActionIds.includes(`${incident.id}-action-0`);

  return (
    <section
      className="ops-panel flex h-full min-h-0 flex-col"
      data-testid="active-incident-workspace"
    >
      <div className="mb-2 border-b border-slate-200 pb-2">
        <h2 className="text-sm font-semibold tracking-tight text-[#07111c]">
          Active incident workspace
        </h2>
      </div>

      <div className="grid min-h-0 gap-3">
        <article className="ops-subpanel p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <PriorityBadge level={incident.priority} />
              </div>
              <h3
                className="mt-2 text-[1.35rem] font-semibold leading-tight tracking-[-0.02em] text-[#07111c]"
                data-testid="selected-incident-title"
              >
                {incident.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {location?.name ?? incident.locationLabel} |{" "}
                {location ? formatZoneLayer(location.zoneLayer) : "Operations"} | {teamName}
              </p>
            </div>

            {copy.riskTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {copy.riskTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-md border border-rose-500/30 bg-rose-500/8 px-2 py-1 text-xs font-medium text-rose-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {primaryAction ? (
              <button
                type="button"
                onClick={() => onApprove(incident.id, primaryAction, 0)}
                disabled={dispatchApproved}
                aria-label={`${copy.actionLabels[0]}: ${primaryAction}`}
                className={`rounded-md border px-4 py-2 text-sm font-semibold transition-colors ${
                  dispatchApproved
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800"
                    : "border-blue-500/40 bg-blue-600 text-white hover:bg-blue-500 disabled:cursor-not-allowed"
                }`}
              >
                {dispatchApproved ? "Dispatch logged" : copy.actionLabels[0]}
              </button>
            ) : null}

            {secondaryActions.map((action, index) => {
              const actionIndex = index + 1;
              const isApproved = incident.approvedActionIds.includes(
                `${incident.id}-action-${actionIndex}`,
              );

              return (
                <button
                  key={`${incident.id}-secondary-${actionIndex}`}
                  type="button"
                  onClick={() => onApprove(incident.id, action, actionIndex)}
                  disabled={isApproved}
                  aria-label={`${copy.actionLabels[actionIndex]}: ${action}`}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    isApproved
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-800"
                      : "border-slate-200 bg-[var(--panel-inset)] text-slate-700 hover:border-slate-300 hover:bg-[var(--panel-hover)] disabled:cursor-not-allowed"
                  }`}
                >
                  {isApproved ? "Logged" : copy.actionLabels[actionIndex]}
                </button>
              );
            })}
          </div>
        </article>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr]">
          <VenueContextCard selectedLocationId={incident.locationId} />

          <div className="flex flex-col gap-3">
            <article className="ops-subpanel p-4">
              <WorkspaceSectionTitle marker="A" title="Response checklist" />
              <div className="space-y-2">
                {copy.checklist.map((item, index) => {
                  const status = getChecklistStatus(approvedActionCount, index);

                  return (
                    <div
                      key={`${incident.id}-check-${item}`}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-2"
                    >
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${status.markerClass}`}
                      >
                        {index + 1}
                      </span>
                      <p className="text-sm text-slate-800">{item}</p>
                      <span
                        className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${status.badgeClass}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="ops-subpanel flex-1 p-4">
              <WorkspaceSectionTitle marker="B" title="Team assignment" />
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500/10 text-lg font-semibold text-blue-700">
                  {teamName
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#07111c]">{teamName}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{copy.teamLabel}</p>
                </div>
                <div className="text-right text-xs text-slate-600">{copy.teamStatus}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (primaryAction) {
                    onApprove(incident.id, primaryAction, 0);
                  }
                }}
                disabled={dispatchApproved || !primaryAction}
                className={`mt-3 w-full rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                  dispatchApproved
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800"
                    : "border-blue-500/40 bg-blue-600 text-white hover:bg-blue-500 disabled:cursor-not-allowed"
                }`}
              >
                {dispatchApproved ? "Team dispatched" : copy.teamButtonLabel}
              </button>
            </article>
          </div>
        </div>

        <OperationsTimeline
          commandState={commandState}
          timeline={timeline}
          selectedIncidentId={incident.id}
        />

        <WorkflowCues incidentPackage={incidentPackage} />

        <div className="flex items-center justify-between px-1 pt-1 text-xs text-slate-500">
          <p data-testid="evidence-drawer-pointer">
            Open drawer: Evidence, Staff Update, Incident log, Report, Source log.
          </p>
        </div>
      </div>
    </section>
  );
}
