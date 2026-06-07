import { useMemo } from "react";

import type { CommandState } from "@/lib/sentinel-command-agent";
import type { IncidentPackage, TimelineEntry } from "@/lib/types";

type OperationsTimelineProps = {
  commandState: CommandState;
  timeline: TimelineEntry[];
  selectedIncidentId?: string;
};

type TimelineRow = {
  team: string;
  incidents: IncidentPackage[];
};

type TimelineBlock = {
  label: string;
  state: "done" | "pending";
};

function simplifyIncidentLabel(title: string): string {
  switch (title) {
    case "Lost child report":
      return "Lost child";
    case "Section 112 assist":
      return "Section 112";
    case "Guest medical assist":
      return "Medical assist";
    case "Elevator 4 down":
      return "Elevator 4";
    case "Restroom out of order":
      return "Restroom";
    case "North concourse crowding":
      return "North concourse";
    case "Gate B backed up":
      return "Gate B";
    default:
      return title;
  }
}

function getIncidentStatusBlocks(
  incidentPackage: IncidentPackage,
  timeline: TimelineEntry[],
): TimelineBlock[] {
  const { incident } = incidentPackage;
  const incidentTimeline = timeline.filter((entry) => entry.incidentId === incident.id);
  const dispatchActionId = `${incident.id}-action-0`;
  const isDispatched = incident.approvedActionIds.includes(dispatchActionId);
  const isResolved =
    incident.recommendedActions.length > 0 &&
    incident.recommendedActions.every((_, index) =>
      incident.approvedActionIds.includes(`${incident.id}-action-${index}`),
    );
  const isAssigned =
    incident.assignedRole !== "Operations" ||
    incidentTimeline.some((entry) => entry.type === "suggested");

  const blocks: TimelineBlock[] = [
    {
      label: simplifyIncidentLabel(incident.title || "Reported"),
      state: "done",
    },
  ];

  if (isResolved) {
    blocks.push({ label: "Resolved", state: "done" });
    return blocks;
  }

  if (isDispatched) {
    blocks.push({ label: "Dispatched", state: "done" });
    blocks.push({ label: "Pending", state: "pending" });
    return blocks;
  }

  if (isAssigned) {
    blocks.push({ label: "Assigned", state: "done" });
    blocks.push({ label: "Pending", state: "pending" });
    return blocks;
  }

  blocks.push({ label: "Assigned", state: "done" });
  blocks.push({ label: "Pending", state: "pending" });
  return blocks;
}

function rankIncident(incidentPackage: IncidentPackage, selectedIncidentId?: string) {
  const { incident } = incidentPackage;
  const priorityWeight =
    incident.priority === "Immediate"
      ? 0
      : incident.priority === "High"
        ? 1
        : incident.priority === "Moderate"
          ? 2
          : 3;
  const selectedWeight = incident.id === selectedIncidentId ? -1 : 0;

  return selectedWeight * 10 + priorityWeight;
}

export function OperationsTimeline({
  commandState,
  timeline,
  selectedIncidentId,
}: OperationsTimelineProps) {
  const rows = useMemo(() => {
    const grouped = new Map<string, IncidentPackage[]>();
    for (const pkg of commandState.incidentPackages) {
      const team = pkg.incident.assignedRole || "Operations";
      const existing = grouped.get(team) || [];
      existing.push(pkg);
      grouped.set(team, existing);
    }

    const result: TimelineRow[] = [];
    for (const [team, incidents] of grouped.entries()) {
      result.push({
        team,
        incidents: [...incidents]
          .sort((a, b) => rankIncident(a, selectedIncidentId) - rankIncident(b, selectedIncidentId))
          .slice(0, 3),
      });
    }

    return result.sort((a, b) => a.team.localeCompare(b.team));
  }, [commandState.incidentPackages, selectedIncidentId]);

  if (commandState.incidentPackages.length === 0) {
    return (
      <section className="ops-subpanel mt-3 flex flex-1 items-center justify-center border border-slate-200 p-8">
        <p className="text-sm font-medium text-slate-500">
          {commandState.pullStatus === null
            ? "Connect operations data to load current incidents."
            : "Pull latest reports to build the operations timeline."}
        </p>
      </section>
    );
  }

  return (
    <section
      className="ops-subpanel mt-3 flex min-h-[280px] flex-1 flex-col overflow-hidden"
      data-testid="operations-timeline"
    >
      <div className="flex items-center justify-between border-b border-slate-200/60 bg-slate-50/50 px-4 py-2">
        <h3 className="text-sm font-semibold tracking-tight text-[#07111c]">
          Operations timeline
        </h3>
        <div className="flex items-center gap-12 text-[0.7rem] font-medium uppercase tracking-wider text-slate-400">
          <span>13:30</span>
          <span>13:45</span>
          <span>14:00</span>
          <span className="font-semibold text-blue-600">NOW</span>
        </div>
      </div>

      <div
        className="flex-1 px-4 py-4"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(124, 146, 170, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(124, 146, 170, 0.08) 1px, transparent 1px)",
          backgroundSize: "2rem 2rem",
        }}
      >
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.team} className="grid gap-3 md:grid-cols-[9rem_1fr]">
              <div className="pt-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  {row.team}
                </span>
              </div>
              <div className="space-y-2">
                {row.incidents.map((pkg) => {
                  const blocks = getIncidentStatusBlocks(pkg, timeline);
                  const isSelected = pkg.incident.id === selectedIncidentId;

                  return (
                    <div
                      key={pkg.incident.id}
                      className={`flex flex-wrap items-center gap-2 ${isSelected ? "opacity-100" : "opacity-80"}`}
                    >
                      {blocks.map((block, index) => (
                        <div key={`${pkg.incident.id}-${block.label}-${index}`} className="flex items-center gap-2">
                          {index > 0 ? (
                            <span className="h-0.5 w-6 bg-slate-300" aria-hidden="true" />
                          ) : null}
                          <span
                            className={`max-w-[11rem] truncate rounded-md border px-3 py-1.5 text-xs font-semibold ${
                              index === 0
                                ? isSelected
                                  ? "border-blue-500/30 bg-white text-slate-900 ring-2 ring-blue-500/20"
                                  : "border-slate-300 bg-white text-slate-900"
                                : block.state === "pending"
                                  ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                                  : "border-slate-900 bg-slate-900 text-white"
                            }`}
                            title={block.label}
                          >
                            {block.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
