import { PriorityBadge } from "@/components/dashboard/priority-badge";
import { SentinelInline } from "@/components/dashboard/sentinel-inline";
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
    riskTags: ["Accessibility assist", "Crowd-flow risk"],
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
    riskTags: ["Accessibility assist", "Vertical access risk"],
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
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-800",
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

function getFeedToneClass(tone: FeedItem["tone"]): string {
  switch (tone) {
    case "green":
      return "bg-emerald-500/15 text-emerald-800";
    case "violet":
      return "bg-violet-500/15 text-violet-800";
    case "blue":
    default:
      return "bg-blue-500/15 text-blue-800";
  }
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

  const evidenceFeed: FeedItem[] =
    incidentPackage.evidence.length > 0
      ? incidentPackage.evidence.slice(0, 3).map((e, i) => ({
          message: e.excerpt,
          timestamp: "—",
          tone: (["blue", "green", "violet"] as const)[i % 3],
        }))
      : [
          { message: incidentPackage.incident.title, timestamp: "—", tone: "blue" },
          { message: `${teamName} reviewing the incident package`, timestamp: "—", tone: "green" },
          { message: "Operations awaiting next update", timestamp: "—", tone: "violet" },
        ];

  return {
    actionLabels,
    checklist,
    riskTags: [],
    teamName,
    teamLabel: "Primary team",
    teamStatus: "Awaiting ETA",
    teamButtonLabel: "Dispatch team",
    timelineSummary: [
      { timestamp: "—", message: incidentPackage.incident.rawText || "Incident received" },
      { timestamp: "—", message: `${teamName} assigned` },
      { timestamp: "—", message: "Response queued" },
    ],
    evidenceFeed,
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
      <h3 className="text-[1.05rem] font-semibold tracking-tight text-[#07111c]">
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
  const recentActivityEntries = [
    ...copy.timelineSummary.slice(-2).map((entry) => ({
      key: `${incident.id}-summary-${entry.message}`,
      timestamp: entry.timestamp,
      message: entry.message,
      markerClass: "bg-slate-400",
    })),
    ...relevantTimeline
      .filter((entry) => entry.type === "approved")
      .slice(-1)
      .map((entry) => ({
        key: entry.id,
        timestamp: entry.timestamp,
        message: "Dispatch approved",
        markerClass: "bg-emerald-500",
      })),
  ].slice(-3);
  const recentEvidence = copy.evidenceFeed.slice(0, 2);

  return (
    <section
      className="ops-panel flex h-full min-h-0 flex-col"
      data-testid="active-incident-workspace"
    >
      <div className="mb-4 border-b border-slate-200 pb-4">
        <h2 className="text-[1.15rem] font-semibold tracking-tight text-[#07111c]">
          Active incident workspace
        </h2>
      </div>

      <div className="grid min-h-0 gap-4">
        <article className="ops-subpanel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <PriorityBadge level={incident.priority} />
              </div>
              <h3
                className="mt-3 text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-[#07111c]"
                data-testid="selected-incident-title"
              >
                {incident.title}
              </h3>
              <SentinelInline incidentPackage={incidentPackage} />
              <p className="mt-3 text-[0.98rem] text-slate-600">
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
                    className="inline-flex items-center rounded-md border border-rose-500/30 bg-rose-500/8 px-3 py-2 text-sm font-medium text-rose-800"
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
                  className={`rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
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
                    <p className="text-[1rem] text-slate-800">{item}</p>
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
              <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-blue-500/10 text-2xl font-semibold text-blue-700">
                {teamName
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[1.15rem] font-semibold text-[#07111c]">{teamName}</p>
                <p className="mt-1 text-[0.98rem] text-slate-600">{copy.teamLabel}</p>
              </div>
              <div className="text-right text-[0.98rem] text-slate-600">
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
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800"
                  : "border-blue-500/40 bg-blue-600 text-white hover:bg-blue-500 disabled:cursor-not-allowed"
              }`}
            >
              {dispatchApproved ? "Team dispatched" : copy.teamButtonLabel}
            </button>
          </article>
        </div>

        <div className="workspace-grid">
          <article className="ops-subpanel p-5">
            <WorkspaceSectionTitle marker="C" title="Recent activity" />
            <div className="space-y-4">
              {recentActivityEntries.map((entry, index) => (
                <div
                  key={entry.key}
                  className="grid grid-cols-[auto_1fr] items-start gap-4"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 inline-flex h-3 w-3 rounded-full ${
                        index === 0 && entry.markerClass === "bg-slate-400"
                          ? "bg-rose-500"
                          : entry.markerClass
                      }`}
                    />
                    <span className="text-sm text-slate-500">{entry.timestamp}</span>
                  </div>
                  <p className="text-[1rem] text-slate-800">{entry.message}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="ops-subpanel p-5">
            <WorkspaceSectionTitle marker="D" title="Recent evidence" />
            <div className="space-y-4">
              {recentEvidence.map((item) => (
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
                  <p className="text-[1rem] text-slate-800">{item.message}</p>
                  <span className="text-sm text-slate-500">{item.timestamp}</span>
                </div>
              ))}
            </div>
            <p
              className="mt-4 text-sm text-slate-500"
              data-testid="evidence-drawer-pointer"
            >
              Evidence reviewed — open drawer for full record.
            </p>
          </article>
        </div>

        {/* Section E — Command File */}
        <article className="ops-subpanel p-5" data-testid="command-file-section">
          <WorkspaceSectionTitle marker="E" title="Command file" />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Priority</dt>
              <dd className="font-medium text-[#07111c]">{incident.priority}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Team</dt>
              <dd className="font-medium text-[#07111c]">{incident.assignedRole}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Location</dt>
              <dd className="font-medium text-[#07111c]">
                {location?.name ?? incident.locationLabel}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="font-medium text-[#07111c] capitalize">{incident.status}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  );
}
