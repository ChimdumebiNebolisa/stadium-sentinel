import { OperationsTimeline } from "@/components/dashboard/operations-timeline";
import { PriorityBadge } from "@/components/dashboard/priority-badge";
import { VenueContextCard } from "@/components/dashboard/venue-context-card";
import { getLocationRecord } from "@/lib/data";
import { getIncidentCompletionLabel } from "@/lib/incident-completion";
import type { IncidentPackage, TimelineEntry } from "@/lib/types";

type ActiveIncidentWorkspaceProps = {
  incidentPackage: IncidentPackage;
  timeline: TimelineEntry[];
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

/** Short button labels — full detail stays in checklist rows and timeline. */
function compactActionLabel(action: string): string {
  const text = action.trim();
  const shortcuts: [RegExp, string][] = [
    [/^dispatch\b/i, "Dispatch team"],
    [/overflow|relief path|relief route/i, "Open overflow"],
    [/alternate route|accessible reroute|reroute/i, "Route support"],
    [/confirm|handoff|reunification|outcome|resolve/i, "Confirm outcome"],
    [/hold.*contact|contact point/i, "Hold contact"],
    [/monitor/i, "Monitor flow"],
    [/post alternate|direction/i, "Post direction"],
    [/verify|verify outage/i, "Verify status"],
    [/isolate|cleanup/i, "Isolate area"],
    [/record/i, "Record handoff"],
    [/route details|queue routing|gate advisory/i, "Route support"],
    [/ops update|radio handoff/i, "Record handoff"],
    [/send facilities/i, "Dispatch team"],
  ];

  for (const [pattern, label] of shortcuts) {
    if (pattern.test(text)) {
      return label;
    }
  }

  if (text.length > 18) {
    const words = text.split(/\s+/);
    return words.length <= 2 ? text : `${words[0]} ${words[1]}`;
  }

  return text;
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

function WorkspaceSectionTitle({ title }: { title: string }) {
  return (
    <h3 className="mb-1.5 text-[0.8125rem] font-semibold tracking-tight text-[#07111c]">
      {title}
    </h3>
  );
}

export function ActiveIncidentWorkspace({
  incidentPackage,
  timeline,
  onApprove,
}: ActiveIncidentWorkspaceProps) {
  const { incident } = incidentPackage;
  const location = getLocationRecord(incident.locationId);
  const copy = WORKSPACE_COPY[incident.id] ?? getFallbackWorkspaceCopy(incidentPackage);
  const teamName = location?.defaultTeams[0] ?? copy.teamName;
  // Prefer the seeded, Elastic-backed response checklist (single source of truth).
  const checklist =
    incident.details?.responseChecklist && incident.details.responseChecklist.length > 0
      ? incident.details.responseChecklist
      : copy.checklist;
  const primaryAction = incident.recommendedActions[0];
  const secondaryActions = incident.recommendedActions.slice(1, 3);
  const primaryButtonLabel = primaryAction
    ? compactActionLabel(primaryAction)
    : copy.teamButtonLabel;
  const approvedActionCount = incident.approvedActionIds.length;
  const dispatchApproved = incident.approvedActionIds.includes(`${incident.id}-action-0`);
  const completionInput = { incident, timeline };
  const completionLabel = getIncidentCompletionLabel(completionInput);

  return (
    <section
      className="ops-panel flex h-full min-h-0 flex-col overflow-visible"
      data-testid="active-incident-workspace"
    >
      <article className="workbench-brief" data-testid="incident-header">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge level={incident.priority} />
              {completionLabel ? (
                <span
                  className="inline-flex rounded-md border border-slate-300/70 bg-slate-100 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-slate-600"
                  data-testid="workspace-completion-badge"
                >
                  {completionLabel}
                </span>
              ) : null}
            </div>
            <h3
              className="mt-1.5 text-[1.2rem] font-semibold leading-tight tracking-[-0.02em] text-[#07111c]"
              data-testid="selected-incident-title"
            >
              {incident.title}
            </h3>
            <p className="mt-1 text-[0.8125rem] text-slate-600">
              {location?.name ?? incident.locationLabel} ·{" "}
              {location ? formatZoneLayer(location.zoneLayer) : "Operations"} · {teamName}
            </p>
            {incident.details?.operatorSummary ? (
              <p
                className="mt-1.5 text-[0.8125rem] leading-5 text-slate-600"
                data-testid="incident-operator-summary"
              >
                {incident.details.operatorSummary}
              </p>
            ) : null}
          </div>

          {copy.riskTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {copy.riskTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded border border-rose-500/25 bg-rose-500/6 px-1.5 py-0.5 text-[0.68rem] font-medium text-rose-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </article>

      <div className="mt-2 grid min-h-0 gap-2">
        <div className="workbench-workspace-grid">
          <VenueContextCard selectedLocationId={incident.locationId} />

          <div className="workbench-side-stack">
            <article className="ops-subpanel p-3">
              <WorkspaceSectionTitle title="Response checklist" />
              <div className="space-y-1.5">
                {checklist.map((item, index) => {
                  const status = getChecklistStatus(approvedActionCount, index);

                  return (
                    <div
                      key={`${incident.id}-check-${item}`}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5"
                    >
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem] font-semibold ${status.markerClass}`}
                      >
                        {index + 1}
                      </span>
                      <p className="text-[0.8125rem] text-slate-800">{item}</p>
                      <span
                        className={`inline-flex rounded border px-1.5 py-0.5 text-[0.65rem] font-medium ${status.badgeClass}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              {secondaryActions.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
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
                        aria-label={`${compactActionLabel(action)}: ${action}`}
                        className={`whitespace-nowrap rounded-md border px-2.5 py-1.5 text-[0.8125rem] font-medium transition-colors ${
                          isApproved
                            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-800"
                            : "border-slate-200 bg-[var(--panel-inset)] text-slate-700 hover:border-slate-300 hover:bg-[var(--panel-hover)] disabled:cursor-not-allowed"
                        }`}
                      >
                        {isApproved ? "Logged" : compactActionLabel(action)}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </article>

            <article className="ops-subpanel p-3">
              <WorkspaceSectionTitle title="Team assignment" />
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10 text-sm font-semibold text-blue-700">
                  {teamName
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.8125rem] font-semibold text-[#07111c]">{teamName}</p>
                  <p className="mt-0.5 text-[0.7rem] text-slate-600">{copy.teamLabel}</p>
                </div>
                <div className="text-right text-[0.7rem] text-slate-600">{copy.teamStatus}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (primaryAction) {
                    onApprove(incident.id, primaryAction, 0);
                  }
                }}
                disabled={dispatchApproved || !primaryAction}
                className={`mt-2 w-full whitespace-nowrap rounded-md border px-2.5 py-1.5 text-[0.8125rem] font-semibold transition-colors ${
                  dispatchApproved
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800"
                    : "border-blue-500/40 bg-blue-600 text-white hover:bg-blue-500 disabled:cursor-not-allowed"
                }`}
                >
                {dispatchApproved ? "Team dispatched" : primaryButtonLabel}
              </button>
            </article>
          </div>
        </div>

        <OperationsTimeline incidentPackage={incidentPackage} timeline={timeline} />

        <p className="px-0.5 pt-0.5 text-[0.7rem] text-slate-500" data-testid="evidence-drawer-pointer">
          Evidence, Staff Update, Incident log, Report, and Source log are in the folder workspace below.
        </p>
      </div>
    </section>
  );
}
