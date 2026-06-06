import { PriorityBadge } from "@/components/dashboard/priority-badge";
import { getLocationRecord } from "@/lib/data";
import type { IncidentPackage, TimelineEntry } from "@/lib/types";

type ActiveIncidentWorkspaceProps = {
  incidentPackage: IncidentPackage;
  timeline: TimelineEntry[];
  onApprove: (incidentId: string, action: string, actionIndex: number) => void;
};

type FeedItem = {
  message: string;
  timestamp: string;
  tone: "blue" | "green" | "violet";
};

type WorkspaceCopy = {
  actionLabels: [string, string, string];
  checklist: [string, string, string];
  riskTags: string[];
  teamName: string;
  teamLabel: string;
  teamStatus: string;
  teamButtonLabel: string;
  timelineSummary: Array<{ timestamp: string; message: string }>;
  evidenceFeed: FeedItem[];
};

const WORKSPACE_COPY: Record<string, WorkspaceCopy> = {
  "incident-section-112": {
    actionLabels: [
      "Dispatch Guest Services",
      "Route details",
      "Radio handoff",
    ],
    checklist: [
      "Acknowledge and assess",
      "Dispatch Guest Services",
      "Escort and resolve",
    ],
    riskTags: ["Accessibility critical", "Crowd-flow risk"],
    teamName: "Guest Services",
    teamLabel: "Primary team",
    teamStatus: "2 staff • 2 min ETA",
    teamButtonLabel: "Dispatch team",
    timelineSummary: [
      { timestamp: "11:42 AM", message: "Incident created" },
      { timestamp: "11:43 AM", message: "Acknowledged" },
      { timestamp: "11:44 AM", message: "Team notified" },
    ],
    evidenceFeed: [
      {
        message: "Guest reported need for wheelchair access",
        timestamp: "11:42 AM",
        tone: "blue",
      },
      {
        message: "Host acknowledged and collecting details",
        timestamp: "11:43 AM",
        tone: "green",
      },
      {
        message: "Radio: Guest Services notified",
        timestamp: "11:44 AM",
        tone: "violet",
      },
    ],
  },
  "incident-elevator-4": {
    actionLabels: ["Send Facilities", "Accessible reroute", "Ops update"],
    checklist: [
      "Acknowledge outage",
      "Dispatch Facilities",
      "Confirm reroute coverage",
    ],
    riskTags: ["Accessibility critical", "Vertical access risk"],
    teamName: "Facilities",
    teamLabel: "Primary team",
    teamStatus: "2 staff • 4 min ETA",
    teamButtonLabel: "Dispatch team",
    timelineSummary: [
      { timestamp: "11:41 AM", message: "Incident created" },
      { timestamp: "11:42 AM", message: "Operations acknowledged" },
      { timestamp: "11:44 AM", message: "Facilities notified" },
    ],
    evidenceFeed: [
      {
        message: "Elevator 4 outage reported from East Stand",
        timestamp: "11:41 AM",
        tone: "blue",
      },
      {
        message: "Accessibility route impact confirmed",
        timestamp: "11:42 AM",
        tone: "green",
      },
      {
        message: "Facilities requesting access check",
        timestamp: "11:44 AM",
        tone: "violet",
      },
    ],
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
    teamStatus: "3 staff • 3 min ETA",
    teamButtonLabel: "Dispatch team",
    timelineSummary: [
      { timestamp: "11:38 AM", message: "Incident created" },
      { timestamp: "11:39 AM", message: "Queue escalation confirmed" },
      { timestamp: "11:41 AM", message: "Security notified" },
    ],
    evidenceFeed: [
      {
        message: "Gate B ingress queue extending into perimeter lane",
        timestamp: "11:38 AM",
        tone: "blue",
      },
      {
        message: "Host reports slower screening throughput",
        timestamp: "11:39 AM",
        tone: "green",
      },
      {
        message: "Security preparing overflow routing",
        timestamp: "11:41 AM",
        tone: "violet",
      },
    ],
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
      badgeClass:
        "border-emerald-400/30 bg-emerald-400/12 text-emerald-100",
      markerClass: "bg-emerald-400 text-[var(--background)]",
    };
  }

  if (index === approvedActionCount) {
    return {
      label: "In progress",
      badgeClass: "border-blue-400/30 bg-blue-500/12 text-blue-100",
      markerClass: "bg-rose-500 text-white",
    };
  }

  return {
    label: "Pending",
    badgeClass: "border-white/10 bg-white/[0.03] text-slate-300",
    markerClass: "bg-[var(--panel-muted)] text-slate-200",
  };
}

function getFeedToneClass(tone: FeedItem["tone"]): string {
  switch (tone) {
    case "green":
      return "bg-emerald-400/18 text-emerald-200";
    case "violet":
      return "bg-violet-400/18 text-violet-200";
    case "blue":
    default:
      return "bg-blue-400/18 text-blue-100";
  }
}

function getFallbackWorkspaceCopy(incidentPackage: IncidentPackage): WorkspaceCopy {
  const teamName = incidentPackage.incident.assignedRole || "Operations";

  return {
    actionLabels: ["Dispatch team", "Route details", "Radio handoff"],
    checklist: ["Acknowledge", "Dispatch team", "Resolve incident"],
    riskTags: [],
    teamName,
    teamLabel: "Primary team",
    teamStatus: "1 staff • Awaiting ETA",
    teamButtonLabel: "Dispatch team",
    timelineSummary: [
      { timestamp: "11:42 AM", message: "Incident created" },
      { timestamp: "11:43 AM", message: "Acknowledged" },
      { timestamp: "11:44 AM", message: "Response queued" },
    ],
    evidenceFeed: [
      {
        message: incidentPackage.incident.title,
        timestamp: "11:42 AM",
        tone: "blue",
      },
      {
        message: `${teamName} reviewing the incident package`,
        timestamp: "11:43 AM",
        tone: "green",
      },
      {
        message: "Operations awaiting next update",
        timestamp: "11:44 AM",
        tone: "violet",
      },
    ],
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
    <div className="mb-4 flex items-center gap-3">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/85 text-sm font-semibold text-white">
        {marker}
      </span>
      <h3 className="text-[1.05rem] font-semibold tracking-tight text-white">
        {title}
      </h3>
    </div>
  );
}

export function ActiveIncidentWorkspace({
  incidentPackage,
  timeline,
  onApprove,
}: ActiveIncidentWorkspaceProps) {
  const { incident } = incidentPackage;
  const location = getLocationRecord(incident.locationId);
  const copy =
    WORKSPACE_COPY[incident.id] ?? getFallbackWorkspaceCopy(incidentPackage);
  const teamName = location?.defaultTeams[0] ?? copy.teamName;
  const primaryAction = incident.recommendedActions[0];
  const secondaryActions = incident.recommendedActions.slice(1, 3);
  const approvedActionCount = incident.approvedActionIds.length;
  const dispatchApproved = incident.approvedActionIds.includes(
    `${incident.id}-action-0`,
  );
  const relevantTimeline = timeline.filter((entry) => entry.incidentId === incident.id);

  return (
    <section
      className="ops-panel flex h-full min-h-0 flex-col"
      data-testid="active-incident-workspace"
    >
      <div className="mb-4 border-b border-white/8 pb-4">
        <h2 className="text-[1.15rem] font-semibold tracking-tight text-white">
          Active incident workspace
        </h2>
      </div>

      <div className="grid min-h-0 gap-4">
        <article className="ops-subpanel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <PriorityBadge level={incident.priority} />
              <h3
                className="mt-3 text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-white"
                data-testid="selected-incident-title"
              >
                {incident.title}
              </h3>
              <p className="mt-3 text-[0.98rem] text-slate-300">
                {location?.name ?? incident.locationLabel} •{" "}
                {location ? formatZoneLayer(location.zoneLayer) : "Operations"} •{" "}
                {teamName}
              </p>
            </div>

            {copy.riskTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {copy.riskTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-md border border-rose-500/30 bg-rose-500/8 px-3 py-2 text-sm font-medium text-rose-100"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {primaryAction ? (
              <button
                type="button"
                onClick={() => onApprove(incident.id, primaryAction, 0)}
                disabled={dispatchApproved}
                aria-label={`${copy.actionLabels[0]}: ${primaryAction}`}
                className={`rounded-md border px-5 py-3 text-sm font-semibold transition-colors ${
                  dispatchApproved
                    ? "border-emerald-400/30 bg-emerald-400/12 text-emerald-100"
                    : "border-blue-400/40 bg-blue-600 text-white hover:bg-blue-500 disabled:cursor-not-allowed"
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
                  className={`rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
                    isApproved
                      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
                      : "border-white/10 bg-[var(--panel-inset)] text-slate-100 hover:border-white/20 hover:bg-[var(--panel-hover)] disabled:cursor-not-allowed"
                  }`}
                >
                  {isApproved ? "Logged" : copy.actionLabels[actionIndex]}
                </button>
              );
            })}
          </div>
        </article>

        <div className="workspace-grid">
          <article className="ops-subpanel p-5">
            <WorkspaceSectionTitle marker="A" title="Response checklist" />
            <div className="space-y-4">
              {copy.checklist.map((item, index) => {
                const status = getChecklistStatus(approvedActionCount, index);

                return (
                  <div
                    key={`${incident.id}-check-${item}`}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-4"
                  >
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${status.markerClass}`}
                    >
                      {index + 1}
                    </span>
                    <p className="text-[1rem] text-slate-100">{item}</p>
                    <span
                      className={`inline-flex rounded-md border px-3 py-1.5 text-sm font-medium ${status.badgeClass}`}
                    >
                      {status.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="ops-subpanel p-5">
            <WorkspaceSectionTitle marker="B" title="Team assignment" />
            <div className="flex items-center gap-4">
              <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-blue-500/14 text-2xl font-semibold text-blue-100">
                {teamName
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[1.15rem] font-semibold text-white">{teamName}</p>
                <p className="mt-1 text-[0.98rem] text-slate-300">{copy.teamLabel}</p>
              </div>
              <div className="text-right text-[0.98rem] text-slate-300">
                {copy.teamStatus}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (primaryAction) {
                  onApprove(incident.id, primaryAction, 0);
                }
              }}
              disabled={dispatchApproved || !primaryAction}
              className={`mt-6 w-full rounded-md border px-4 py-3 text-sm font-semibold transition-colors ${
                dispatchApproved
                  ? "border-emerald-400/30 bg-emerald-400/12 text-emerald-100"
                  : "border-blue-400/40 bg-blue-600 text-white hover:bg-blue-500 disabled:cursor-not-allowed"
              }`}
            >
              {dispatchApproved ? "Team dispatched" : copy.teamButtonLabel}
            </button>
          </article>
        </div>

        <div className="workspace-grid">
          <article className="ops-subpanel p-5">
            <WorkspaceSectionTitle marker="C" title="Timeline" />
            <div className="space-y-4">
              {copy.timelineSummary.map((entry, index) => (
                <div
                  key={`${incident.id}-timeline-${entry.message}`}
                  className="grid grid-cols-[auto_1fr] items-start gap-4"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 inline-flex h-3 w-3 rounded-full ${
                        index === 0 ? "bg-rose-500" : "bg-slate-300"
                      }`}
                    />
                    <span className="text-sm text-slate-400">{entry.timestamp}</span>
                  </div>
                  <p className="text-[1rem] text-slate-100">{entry.message}</p>
                </div>
              ))}

              {relevantTimeline
                .filter((entry) => entry.type === "approved")
                .slice(-1)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-[auto_1fr] items-start gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-3 w-3 rounded-full bg-emerald-400" />
                      <span className="text-sm text-slate-400">{entry.timestamp}</span>
                    </div>
                    <p className="text-[1rem] text-slate-100">Dispatch approved</p>
                  </div>
                ))}
            </div>
          </article>

          <article className="ops-subpanel p-5">
            <WorkspaceSectionTitle marker="D" title="Evidence feed" />
            <div className="space-y-4">
              {copy.evidenceFeed.map((item) => (
                <div
                  key={`${incident.id}-feed-${item.message}`}
                  className="grid grid-cols-[auto_1fr_auto] items-start gap-4"
                >
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${getFeedToneClass(item.tone)}`}
                  >
                    {item.tone === "blue"
                      ? "I"
                      : item.tone === "green"
                        ? "U"
                        : "R"}
                  </span>
                  <p className="text-[1rem] text-slate-100">{item.message}</p>
                  <span className="text-sm text-slate-400">{item.timestamp}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
