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

function getIncidentStatusBlocks(
  incidentPackage: IncidentPackage,
  timeline: TimelineEntry[]
) {
  const { incident } = incidentPackage;
  const incidentTimeline = timeline.filter((e) => e.incidentId === incident.id);

  // Basic heuristics for timeline stages based on data
  const isReported = incidentTimeline.some((e) => e.type === "reported") || true;
  const isAcknowledged = incidentTimeline.some((e) => e.type === "suggested");
  const isAssigned = incident.assignedRole !== "Operations";
  const dispatchActionId = `${incident.id}-action-0`;
  const isDispatched = incident.approvedActionIds.includes(dispatchActionId);
  const isResolved =
    incident.recommendedActions.length > 0 &&
    incident.recommendedActions.every((_, index) =>
      incident.approvedActionIds.includes(`${incident.id}-action-${index}`)
    );

  const blocks = [];

  // Intake block
  blocks.push({
    label: incident.title || "Reported",
    state: "done",
  });

  // Action / State block
  if (isResolved) {
    blocks.push({ label: "Resolved", state: "done" });
  } else if (isDispatched) {
    blocks.push({ label: "Dispatched", state: "done" });
    blocks.push({ label: "Pending update", state: "pending" });
  } else if (isAssigned || isAcknowledged) {
    blocks.push({ label: "Assigned", state: "done" });
    blocks.push({ label: "Dispatch pending", state: "pending" });
  } else {
    blocks.push({ label: "Acknowledged", state: "done" });
    blocks.push({ label: "Assigning", state: "pending" });
  }

  return blocks;
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
      result.push({ team, incidents });
    }
    return result.sort((a, b) => a.team.localeCompare(b.team));
  }, [commandState.incidentPackages]);

  if (commandState.incidentPackages.length === 0) {
    return (
      <section className="ops-subpanel mt-3 flex-1 flex items-center justify-center p-8 border border-slate-200">
        <p className="text-sm text-slate-500 font-medium">
          {commandState.pullStatus === null
            ? "Connect operations data to load current incidents."
            : "Pull latest reports to build the operations timeline."}
        </p>
      </section>
    );
  }

  return (
    <section className="ops-subpanel mt-3 flex-1 flex flex-col min-h-[250px] overflow-hidden" data-testid="operations-timeline">
      <div className="flex items-center justify-between border-b border-slate-200/60 bg-slate-50/50 px-4 py-2">
        <h3 className="text-sm font-semibold tracking-tight text-[#07111c]">
          Operations timeline
        </h3>
        <div className="flex items-center gap-16 text-[0.7rem] font-medium uppercase tracking-wider text-slate-400">
          <span>13:30</span>
          <span>13:45</span>
          <span>14:00</span>
          <span className="text-blue-600 font-semibold">NOW</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 relative" style={{
        backgroundImage: "linear-gradient(to right, rgba(124, 146, 170, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(124, 146, 170, 0.08) 1px, transparent 1px)",
        backgroundSize: "2rem 2rem"
      }}>
        {rows.map((row) => (
          <div key={row.team} className="mb-6 last:mb-0 relative">
            <div className="flex">
              <div className="w-32 flex-shrink-0 pt-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  {row.team}
                </span>
              </div>
              <div className="flex-1 relative min-h-[2.5rem]">
                {row.incidents.map((pkg, i) => {
                  const isSelected = pkg.incident.id === selectedIncidentId;
                  const blocks = getIncidentStatusBlocks(pkg, timeline);

                  return (
                    <div
                      key={pkg.incident.id}
                      className={`flex items-center absolute top-0 ${i > 0 ? "mt-12" : ""} ${isSelected ? "opacity-100 z-10" : "opacity-60 hover:opacity-100 z-0"} transition-opacity duration-200`}
                      style={{ left: `${i * 10}%` }}
                    >
                      {blocks.map((block, idx) => (
                        <div key={idx} className="flex items-center">
                          {/* Connector from previous */}
                          {idx > 0 && (
                            <div
                              className={`h-0.5 w-16 md:w-32 ${block.state === "pending" ? "border-t border-dashed border-slate-300" : "bg-slate-800"}`}
                            />
                          )}

                          {/* Block */}
                          <div
                            className={`flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-sm border ${
                              idx === 0
                                ? "bg-white border-slate-800 text-slate-800 shadow-sm" // First block (incident name)
                                : block.state === "pending"
                                  ? "bg-indigo-50/50 border-indigo-200 text-indigo-800" // Pending
                                  : block.label === "Resolved" || block.label === "Cleared"
                                    ? "bg-emerald-50/50 border-emerald-300 text-emerald-700" // Resolved
                                    : "bg-slate-900 border-slate-900 text-white" // Done action
                            } ${isSelected && idx === 0 ? "ring-2 ring-blue-500/30 ring-offset-1" : ""}`}
                          >
                            {block.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
