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
import { demoScenario } from "@/lib/data";
import { buildDemoState } from "@/lib/demo";
import { buildPostEventReport } from "@/lib/report";
import type {
  AgentRunResult,
  IncidentPackage,
  ReportSummary,
  TimelineEntry,
} from "@/lib/types";

const initialDemoState = buildDemoState();

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

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-4 py-4 md:px-6 md:py-5">
      <CommandHeader
        incidentCount={incidentPackages.length}
        topPriority={topPriority}
      />

      <section className="grid gap-3 xl:grid-cols-[1.9fr_1fr] xl:items-start">
        <VenueMap
          incidentPackages={incidentPackages}
          selectedIncidentId={selectedIncidentId}
          onSelect={setSelectedIncidentId}
        />
        <div className="grid content-start gap-3">
          <IncidentList
            incidentPackages={incidentPackages}
            selectedIncidentId={selectedIncidentId}
            onSelect={setSelectedIncidentId}
          />
          {selectedIncidentPackage ? (
            <section className="ops-panel">
              <IncidentDetailPanel incidentPackage={selectedIncidentPackage} />
              <div className="mt-4 space-y-3">
                <ActionPlanPanel
                  incidentPackage={selectedIncidentPackage}
                  onApprove={handleApprove}
                />
                <EvidencePanel incidentPackage={selectedIncidentPackage} />
              </div>
            </section>
          ) : (
            <section className="ops-panel">
              <h2 className="ops-heading text-lg">
                No incidents matched the current report
              </h2>
              <p className="mt-2 max-w-[60ch] text-sm leading-6 text-slate-300">
                Use the demo scenario text to restore the active queue, map
                markers, evidence, and approval workflow.
              </p>
            </section>
          )}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        {selectedIncidentPackage ? (
          <StaffUpdatePanel staffUpdate={selectedIncidentPackage.staffUpdate} />
        ) : (
          <div className="ops-panel text-sm text-slate-400">
            Staff update appears when an incident is selected.
          </div>
        )}
        <TimelinePanel timeline={timeline} />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <ReportInput
          report={report}
          isSubmitting={isSubmitting}
          onChange={setReport}
          onSubmit={handleSubmit}
        />
        <PostEventReportPanel reportSummary={reportSummary} />
      </section>

      <footer className="px-1 text-xs text-slate-500">
        Demo scenario loaded: {demoScenario.name}
      </footer>
    </main>
  );
}
