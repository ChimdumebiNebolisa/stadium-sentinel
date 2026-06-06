"use client";

import { useState } from "react";

import { ActionPlanPanel } from "@/components/dashboard/action-plan-panel";
import { CommandHeader } from "@/components/dashboard/command-header";
import { EvidencePanel } from "@/components/dashboard/evidence-panel";
import { IncidentDetailPanel } from "@/components/dashboard/incident-detail-panel";
import { IncidentList } from "@/components/dashboard/incident-list";
import { PostEventReportPanel } from "@/components/dashboard/post-event-report-panel";
import { ReportInput } from "@/components/dashboard/report-input";
import { StaffUpdatePanel } from "@/components/dashboard/staff-update-panel";
import { TimelinePanel } from "@/components/dashboard/timeline-panel";
import { VenueMap } from "@/components/dashboard/venue-map";
import { buildDemoState } from "@/lib/demo";
import { buildPostEventReport } from "@/lib/report";
import type {
  AgentRunResult,
  IncidentPackage,
  ReportSummary,
  TimelineEntry,
} from "@/lib/types";

const initialDemoState = buildDemoState();
type WorkspaceView = "evidence" | "staff" | "timeline" | "report";

function getLatestDrawerText(message?: string): string {
  if (!message) {
    return "Latest: Gate B crowd lead assigned";
  }

  if (message.includes("Elevator 4")) {
    return "Latest: Elevator 4 diagnosis requested";
  }

  if (message.includes("Section 112")) {
    return "Latest: Guest Services to Section 112";
  }

  if (message.includes("Gate B") || message.includes("Crowd Flow Lead")) {
    return "Latest: Gate B crowd lead assigned";
  }

  const trimmed = message.replace(/\.$/, "");
  const shortText =
    trimmed.length > 40 ? `${trimmed.slice(0, 37).trimEnd()}...` : trimmed;

  return `Latest: ${shortText}`;
}

function updateIncidentPackages(
  incidentPackages: IncidentPackage[],
  incidentId: string,
  actionIndex: number,
): IncidentPackage[] {
  return incidentPackages.map((incidentPackage) => {
    if (incidentPackage.incident.id !== incidentId) {
      return incidentPackage;
    }

    const actionId = `${incidentId}-action-${actionIndex}`;

    if (incidentPackage.incident.approvedActionIds.includes(actionId)) {
      return incidentPackage;
    }

    return {
      ...incidentPackage,
      incident: {
        ...incidentPackage.incident,
        status: "actioned",
        approvedActionIds: [...incidentPackage.incident.approvedActionIds, actionId],
      },
    };
  });
}

export function CommandCenter() {
  const [report, setReport] = useState(() => initialDemoState.report);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [incidentPackages, setIncidentPackages] = useState<IncidentPackage[]>(
    () => initialDemoState.incidentPackages,
  );
  const [selectedIncidentId, setSelectedIncidentId] = useState(
    () => initialDemoState.incidentPackages[0]?.incident.id ?? "",
  );
  const [timeline, setTimeline] = useState<TimelineEntry[]>(
    () => initialDemoState.timeline,
  );
  const [reportSummary, setReportSummary] = useState<ReportSummary>(
    () => initialDemoState.reportSummary,
  );
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceView | null>(
    null,
  );

  const selectedIncidentPackage =
    incidentPackages.find(({ incident }) => incident.id === selectedIncidentId) ??
    incidentPackages[0];

  async function handleSubmit() {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ report }),
      });

      if (!response.ok) {
        throw new Error("Agent refresh failed.");
      }

      const nextState = (await response.json()) as AgentRunResult;
      setIncidentPackages(nextState.incidentPackages);
      setTimeline(nextState.timeline);
      setReportSummary(nextState.reportSummary);
      setSelectedIncidentId(nextState.incidentPackages[0]?.incident.id ?? "");
    } catch {
      const nextState = buildDemoState(report);
      setIncidentPackages(nextState.incidentPackages);
      setTimeline(nextState.timeline);
      setReportSummary(nextState.reportSummary);
      setSelectedIncidentId(nextState.incidentPackages[0]?.incident.id ?? "");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleApprove(incidentId: string, action: string, actionIndex: number) {
    const nextIncidentPackages = updateIncidentPackages(
      incidentPackages,
      incidentId,
      actionIndex,
    );
    const entryId = `${incidentId}-approved-${actionIndex}`;
    const nextTimeline = timeline.some((entry) => entry.id === entryId)
      ? timeline
      : [
          ...timeline,
          {
            id: entryId,
            incidentId,
            timestamp: `20:${20 + timeline.length}`,
            type: "approved" as const,
            message: action,
            actor: "Operations Lead",
          },
        ];

    setIncidentPackages(nextIncidentPackages);
    setTimeline(nextTimeline);
    setReportSummary(buildPostEventReport(nextIncidentPackages, nextTimeline));
  }

  const topPriority = incidentPackages[0]?.incident.priority ?? "Monitor";
  const workspaceTabs: Array<{ id: WorkspaceView; label: string; inputId: string }> = [
    { id: "evidence", label: "Evidence", inputId: "workspace-evidence" },
    { id: "staff", label: "Staff Update", inputId: "workspace-staff" },
    { id: "timeline", label: "Timeline", inputId: "workspace-timeline" },
    { id: "report", label: "Report", inputId: "workspace-report" },
  ];
  const latestEntry = timeline[timeline.length - 1];
  const latestSummary = getLatestDrawerText(
    latestEntry?.message ?? selectedIncidentPackage?.incident.recommendedActions[0],
  );

  function openWorkspace(view: WorkspaceView) {
    setActiveWorkspace(view);
  }

  return (
    <div className="workbench-shell">
      <main className="workbench">
        <CommandHeader
          incidentCount={incidentPackages.length}
          topPriority={topPriority}
        />

        <section className="board-grid">
          <div className="board-column min-h-0">
            <IncidentList
              incidentPackages={incidentPackages}
              selectedIncidentId={selectedIncidentId}
              onSelect={setSelectedIncidentId}
            />
          </div>

          <div className="board-column min-h-0">
            <VenueMap
              incidentPackages={incidentPackages}
              selectedIncidentId={selectedIncidentId}
              onSelect={setSelectedIncidentId}
            />
          </div>

          <div className="board-column min-h-0">
            <section className="ops-panel flex h-full min-h-0 flex-col overflow-hidden">
              <div className="command-brief-scroll min-h-0 flex-1">
                {selectedIncidentPackage ? (
                  <>
                    <IncidentDetailPanel incidentPackage={selectedIncidentPackage} />
                    <ActionPlanPanel
                      incidentPackage={selectedIncidentPackage}
                      onApprove={handleApprove}
                    />
                  </>
                ) : (
                  <>
                    <h2 className="ops-heading text-lg">
                      No incidents matched the current report
                    </h2>
                    <p className="mt-2 max-w-[60ch] text-sm leading-6 text-slate-300">
                      Use the demo scenario text to restore the active queue, map
                      markers, evidence, and approval workflow.
                    </p>
                  </>
                )}
              </div>
            </section>
          </div>
        </section>

        <section className="utility-drawer" data-state={activeWorkspace ? "open" : "closed"}>
          <div className="utility-drawer-body min-h-0 overflow-hidden px-4 py-3">
            <div
              id="workspace-panel-evidence"
              data-state={activeWorkspace === "evidence" ? "open" : "closed"}
              className="utility-drawer-panel h-full overflow-y-auto"
            >
              {selectedIncidentPackage ? (
                <EvidencePanel incidentPackage={selectedIncidentPackage} />
              ) : (
                <div className="text-sm text-slate-400">
                  Evidence appears when an incident is selected.
                </div>
              )}
            </div>

            <div
              id="workspace-panel-staff"
              data-state={activeWorkspace === "staff" ? "open" : "closed"}
              className="utility-drawer-panel h-full overflow-y-auto"
            >
              {selectedIncidentPackage ? (
                <StaffUpdatePanel staffUpdate={selectedIncidentPackage.staffUpdate} />
              ) : (
                <div className="text-sm text-slate-400">
                  Staff update appears when an incident is selected.
                </div>
              )}
            </div>

            <div
              id="workspace-panel-timeline"
              data-state={activeWorkspace === "timeline" ? "open" : "closed"}
              className="utility-drawer-panel h-full overflow-y-auto"
            >
              <TimelinePanel timeline={timeline} />
            </div>

            <div
              id="workspace-panel-report"
              data-state={activeWorkspace === "report" ? "open" : "closed"}
              className="utility-drawer-grid h-full gap-4 overflow-y-auto xl:grid-cols-[24rem_minmax(0,1fr)]"
            >
              <ReportInput
                report={report}
                isSubmitting={isSubmitting}
                onChange={setReport}
                onSubmit={handleSubmit}
              />
              <PostEventReportPanel reportSummary={reportSummary} />
            </div>
          </div>

          <div className="utility-drawer-bar">
            <div
              className="flex min-w-0 items-center gap-2"
              aria-label="Workspace panels"
              role="tablist"
            >
              {workspaceTabs.map((tab) => {
                const isActive = activeWorkspace === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`workspace-panel-${tab.id}`}
                    onClick={() => openWorkspace(tab.id)}
                    className={`utility-tab ${
                      isActive ? "utility-tab-active" : "utility-tab-idle"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <p className="utility-latest" title={latestSummary}>
              {latestSummary}
            </p>

            <div className="utility-drawer-controls">
              {activeWorkspace ? (
                <button
                  type="button"
                  onClick={() => setActiveWorkspace(null)}
                  className="rounded-md border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:border-white/18 hover:text-white"
                >
                  Collapse
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
