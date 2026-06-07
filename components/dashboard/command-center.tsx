"use client";

import { useEffect, useMemo, useState } from "react";

import { ActiveIncidentWorkspace } from "@/components/dashboard/active-incident-workspace";
import { CommandHeader } from "@/components/dashboard/command-header";
import { DemoMemoryPanel } from "@/components/dashboard/demo-memory-panel";
import { EvidencePanel } from "@/components/dashboard/evidence-panel";
import { IncidentDrawer } from "@/components/dashboard/incident-drawer";
import { IncidentList } from "@/components/dashboard/incident-list";
import { IntakeContextBar } from "@/components/dashboard/intake-context-bar";
import { PostEventReportPanel } from "@/components/dashboard/post-event-report-panel";
import { ReportInput } from "@/components/dashboard/report-input";
import { SourceLogPanel } from "@/components/dashboard/source-log-panel";
import { StaffUpdatePanel } from "@/components/dashboard/staff-update-panel";
import { TimelinePanel } from "@/components/dashboard/timeline-panel";
import {
  checkRateLimit,
  generateDemoIncidentBatch,
  getPoolIncidentById,
  loadDemoIncidentBatch,
  localStorageIncidentToPackage,
  recordPull,
  saveDemoIncidentBatch,
} from "@/lib/demo-incident-pool";
import {
  buildChangeSummary,
  buildDemoReportDraft,
  buildIncidentMemorySummary,
  type ChangeSummary,
} from "@/lib/demo-agent-workflow";
import { buildEmptyCommandState } from "@/lib/command-empty-state";
import { buildDemoState } from "@/lib/demo";
import { resolveSelectedIncidentId } from "@/lib/demo-flow-state";
import {
  appendTranscriptTimelineEntries,
  buildExtractionStatusMessage,
  enrichPackagesWithTranscriptEvidence,
  extractTranscriptIncidents,
  loadRadioTranscriptRecord,
  mergeAddedIncidentsIntoBatch,
  rebuildTimelineFromPersistedState,
  saveRadioTranscriptRecord,
  sortIncidentPackages,
  type RadioTranscriptRecord,
} from "@/lib/radio-transcript-intake";
import {
  evaluateAutomaticIngestionGate,
  runAutomaticIngestionPrototype,
} from "@/lib/automatic-ingestion";
import {
  markOperationsConnected,
  readOperationsConnected,
  readSourcesConnected,
} from "@/lib/intake-demo";
import { fetchIngestBootstrap } from "@/lib/ingest-bootstrap-client";
import { fetchIngestPull } from "@/lib/ingest-pull-client";
import { isElasticPullEnabled, isRealDemoFlowEnabled } from "@/lib/feature-flags";
import {
  fetchManualIngestionResult,
  planManualReportIngestion,
} from "@/lib/manual-report-ingestion";
import { writeApprovedTimelineEntry } from "@/lib/timeline-write-client";
import type { SentinelRecommendedAction } from "@/lib/agent/sentinel-schema";
import { buildPostEventReport } from "@/lib/report";
import { buildResponseTimeline } from "@/lib/response-timeline";
import type { NormalizedIngestionResult } from "@/lib/source-mode";
import { INGESTION_CONTRACTS } from "@/lib/source-mode";
import {
  appendSourceAuditEvent,
  buildSourceAuditEvent,
  getRecentSourceAuditExcerpts,
  loadSourceAuditEvents,
  type SourceAuditEvent,
} from "@/lib/source-audit";
import { getActiveLocationIdsFromPackages } from "@/lib/venue-schematic";
import type { CommandState } from "@/lib/sentinel-command-agent";
import type {
  IncidentPackage,
  ReportSummary,
  TimelineEntry,
} from "@/lib/types";

const realDemoFlowEnabled = isRealDemoFlowEnabled();
const initialCommandState = realDemoFlowEnabled
  ? buildEmptyCommandState()
  : buildDemoState();
type WorkspaceView = "evidence" | "staff" | "timeline" | "report" | "source";

function resolveTranscriptTitle(
  incidentId: string,
  incidentPackages: IncidentPackage[],
): string {
  return (
    incidentPackages.find(({ incident }) => incident.id === incidentId)?.incident.title ??
    getPoolIncidentById(incidentId)?.title ??
    incidentId
  );
}

function getLatestDrawerText(
  incidentId?: string,
  latestEntry?: TimelineEntry,
): string {
  if (!incidentId) {
    return "Latest: Awaiting incident updates.";
  }

  if (latestEntry?.type === "approved") {
    switch (incidentId) {
      case "incident-section-112":
        return "Latest: Guest Services notified via radio.";
      case "incident-elevator-4":
        return "Latest: Facilities dispatched to Elevator 4.";
      case "incident-gate-b":
        return "Latest: Security routed to Gate B.";
      default:
        return "Latest: Dispatch approved.";
    }
  }

  switch (incidentId) {
    case "incident-section-112":
      return "Latest: Guest Services assignment confirmed.";
    case "incident-elevator-4":
      return "Latest: Facilities assessing Elevator 4.";
    case "incident-gate-b":
      return "Latest: Security monitoring Gate B flow.";
    default:
      return "Latest: Operational review in progress.";
  }
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
  const [report, setReport] = useState(() => initialCommandState.report);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [incidentPackages, setIncidentPackages] = useState<IncidentPackage[]>(
    () => initialCommandState.incidentPackages,
  );
  const [selectedIncidentId, setSelectedIncidentId] = useState(
    () => initialCommandState.incidentPackages[0]?.incident.id ?? "",
  );
  const [timeline, setTimeline] = useState<TimelineEntry[]>(
    () => initialCommandState.timeline,
  );
  const [reportSummary, setReportSummary] = useState<ReportSummary>(
    () => initialCommandState.reportSummary,
  );
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceView | null>(
    null,
  );
  const [pullStatus, setPullStatus] = useState<string | null>(null);
  const [changeSummary, setChangeSummary] = useState<ChangeSummary | null>(null);
  const [batchGeneratedAt, setBatchGeneratedAt] = useState<string | null>(null);
  const [latestTranscriptRecord, setLatestTranscriptRecord] =
    useState<RadioTranscriptRecord | null>(null);
  const [transcriptExtractStatus, setTranscriptExtractStatus] = useState<string | null>(
    null,
  );
  const [sourceMode, setSourceMode] = useState<CommandState["sourceMode"]>(null);
  const [lastIngestionSummary, setLastIngestionSummary] = useState<string | null>(
    null,
  );
  const [sourceAuditEvents, setSourceAuditEvents] = useState<SourceAuditEvent[]>(
    [],
  );
  const [ingestionFallbackMessage, setIngestionFallbackMessage] = useState<
    string | null
  >(null);
  const [automaticIngestStatus, setAutomaticIngestStatus] = useState<string | null>(
    null,
  );
  const [sourcesConnected, setSourcesConnected] = useState(false);
  const [operationsConnected, setOperationsConnected] = useState(false);
  const [connectStatus, setConnectStatus] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [ingestionRefreshKey, setIngestionRefreshKey] = useState(0);

  useEffect(() => {
    setSourcesConnected(readSourcesConnected());
    setOperationsConnected(readOperationsConnected());
  }, []);

  const automaticIngestGate = useMemo(
    () =>
      evaluateAutomaticIngestionGate(
        realDemoFlowEnabled ? operationsConnected : sourcesConnected,
      ),
    [sourcesConnected, operationsConnected],
  );

  function recordSourceAudit(
    sourceMode: NormalizedIngestionResult["sourceMode"],
    summary: string,
    outcome: NormalizedIngestionResult["outcome"],
    incidentCount: number,
  ) {
    const contract = INGESTION_CONTRACTS[sourceMode];
    const event = buildSourceAuditEvent({
      sourceMode,
      label: contract.label,
      summary,
      outcome,
      incidentCount,
    });
    setSourceAuditEvents((current) => appendSourceAuditEvent(event, current));
    return event;
  }

  function applyNormalizedIngestion(result: NormalizedIngestionResult) {
    setIncidentPackages(result.incidentPackages);
    setTimeline(result.timeline);
    setReportSummary(result.reportSummary);
    setSelectedIncidentId(result.incidentPackages[0]?.incident.id ?? "");
    setSourceMode(result.sourceMode);
    setLastIngestionSummary(result.ingestionSummary);
    recordSourceAudit(
      result.sourceMode,
      result.ingestionSummary,
      result.outcome,
      result.incidentPackages.length,
    );
  }

  // Read localStorage batch on mount (client-only — avoids hydration mismatch).
  // Real-demo mode stays empty until operations data is connected and pulled.
  useEffect(() => {
    setSourceAuditEvents(loadSourceAuditEvents());

    if (realDemoFlowEnabled && !readOperationsConnected()) {
      return;
    }

    const batch = loadDemoIncidentBatch();
    const transcriptRecord = loadRadioTranscriptRecord();
    setLatestTranscriptRecord(transcriptRecord);

    if (!batch) {
      if (!realDemoFlowEnabled && transcriptRecord) {
        setTimeline((current) =>
          rebuildTimelineFromPersistedState(
            initialCommandState.incidentPackages,
            current,
            transcriptRecord,
          ),
        );
      }
      return;
    }

    const packages = batch.incidents.map(localStorageIncidentToPackage);
    if (packages.length === 0) return;
    const enrichedPackages = transcriptRecord
      ? enrichPackagesWithTranscriptEvidence(
          packages,
          transcriptRecord.matchedLines,
          transcriptRecord.extractedIncidentIds,
        )
      : packages;
    const sortedPackages = sortIncidentPackages(enrichedPackages);
    setIncidentPackages(sortedPackages);
    setSelectedIncidentId((current) =>
      resolveSelectedIncidentId(sortedPackages, current),
    );
    setTimeline(
      rebuildTimelineFromPersistedState(sortedPackages, [], transcriptRecord),
    );
    setReportSummary(
      buildPostEventReport(
        sortedPackages,
        rebuildTimelineFromPersistedState(sortedPackages, [], transcriptRecord),
      ),
    );
    setBatchGeneratedAt(batch.generatedAt);
  }, []);

  const selectedIncidentPackage =
    incidentPackages.find(({ incident }) => incident.id === selectedIncidentId) ??
    incidentPackages[0];

  async function handleSubmit(options?: { confirmedReplace?: boolean }) {
    const plan = planManualReportIngestion({
      reportText: report,
      queueNonEmpty: incidentPackages.length > 0,
      confirmedReplace: options?.confirmedReplace ?? false,
    });

    if (plan.type === "needs_confirmation") {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await fetchManualIngestionResult(report);
      applyNormalizedIngestion(result);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleApprove(
    incidentId: string,
    action: string,
    actionIndex: number,
    options?: { sentinelRecommendationId?: string },
  ) {
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

    const approvedPackage = nextIncidentPackages.find(
      ({ incident }) => incident.id === incidentId,
    );
    if (!approvedPackage) {
      return;
    }

    void writeApprovedTimelineEntry({
      incidentId,
      actionIndex,
      actionLabel: action,
      actor: "Operations Lead",
      sentinelRecommendationId: options?.sentinelRecommendationId,
      incidentPackage: approvedPackage,
    })
      .then((result) => {
        recordSourceAudit(
          result.elasticWritten ? "elastic" : "demo",
          result.sourceAuditSummary,
          result.elasticWritten ? "success" : "fallback",
          1,
        );
      })
      .catch(() => {
        recordSourceAudit(
          "demo",
          `Local approval recorded for ${incidentId}; Elastic write-back unavailable.`,
          "fallback",
          1,
        );
      });
  }

  function handleApplySentinelRecommendation(recommendation: SentinelRecommendedAction) {
    const selected = selectedIncidentPackage;
    if (!selected || recommendation.actionIndex === undefined) {
      return;
    }

    const action =
      selected.incident.recommendedActions[recommendation.actionIndex] ??
      recommendation.label;
    handleApprove(selected.incident.id, action, recommendation.actionIndex, {
      sentinelRecommendationId: recommendation.label,
    });
  }

  async function handleConnectOperationsData() {
    setConnectLoading(true);
    setConnectStatus(null);

    try {
      const result = await fetchIngestBootstrap();
      setIngestionRefreshKey((current) => current + 1);

      if (result.outcome === "ready" || result.outcome === "seeded") {
        markOperationsConnected();
        setOperationsConnected(true);
        setConnectStatus("Seeded stadium operations data connected.");
        return;
      }

      if (result.outcome === "unconfigured") {
        setConnectStatus(
          "Elastic is not configured. Local fallback remains available.",
        );
        return;
      }

      setConnectStatus(
        result.errorSummary ?? "Could not connect stadium operations data.",
      );
    } catch {
      setConnectStatus(
        "Could not connect stadium operations data. Local fallback remains available.",
      );
    } finally {
      setConnectLoading(false);
    }
  }

  async function handlePullLatestReports() {
    const { allowed } = checkRateLimit();
    if (!allowed) {
      setPullStatus("Incidents are up to date. Try again shortly.");
      return;
    }

    const previousPackages = incidentPackages;
    recordPull();

    if (isElasticPullEnabled()) {
      try {
        const elasticPull = await fetchIngestPull();
        if (elasticPull.sourceMode === "elastic" && elasticPull.outcome === "success") {
          const packages = elasticPull.incidentPackages;
          const enrichedPackages = latestTranscriptRecord
            ? enrichPackagesWithTranscriptEvidence(
                packages,
                latestTranscriptRecord.matchedLines,
                latestTranscriptRecord.extractedIncidentIds.filter((id) =>
                  packages.some(({ incident }) => incident.id === id),
                ),
              )
            : packages;
          const sortedPackages = sortIncidentPackages(enrichedPackages);
          const nextTimeline = rebuildTimelineFromPersistedState(
            sortedPackages,
            elasticPull.timeline,
            latestTranscriptRecord,
          );
          setChangeSummary(buildChangeSummary(previousPackages, sortedPackages));
          setIncidentPackages(sortedPackages);
          setSelectedIncidentId((current) =>
            resolveSelectedIncidentId(sortedPackages, current),
          );
          setTimeline(nextTimeline);
          setReportSummary(buildPostEventReport(sortedPackages, nextTimeline));
          setSourceMode("elastic");
          setLastIngestionSummary(elasticPull.ingestionSummary);
          setPullStatus(
            `Seeded operations data pulled from Elastic (${sortedPackages.length} incidents).`,
          );
          recordSourceAudit(
            "elastic",
            elasticPull.ingestionSummary,
            "success",
            sortedPackages.length,
          );
          return;
        }
      } catch {
        // Fall through to local demo pull.
      }
    }

    const batch = generateDemoIncidentBatch();
    saveDemoIncidentBatch(batch);
    const packages = batch.incidents.map(localStorageIncidentToPackage);
    if (packages.length === 0) return;
    const enrichedPackages = latestTranscriptRecord
      ? enrichPackagesWithTranscriptEvidence(
          packages,
          latestTranscriptRecord.matchedLines,
          latestTranscriptRecord.extractedIncidentIds.filter((id) =>
            packages.some(({ incident }) => incident.id === id),
          ),
        )
      : packages;
    const sortedPackages = sortIncidentPackages(enrichedPackages);
    const nextTimeline = rebuildTimelineFromPersistedState(
      sortedPackages,
      [],
      latestTranscriptRecord,
    );
    setChangeSummary(buildChangeSummary(previousPackages, sortedPackages));
    setBatchGeneratedAt(batch.generatedAt);
    setIncidentPackages(sortedPackages);
    setSelectedIncidentId((current) =>
      resolveSelectedIncidentId(sortedPackages, current),
    );
    setTimeline(nextTimeline);
    setReportSummary(buildPostEventReport(sortedPackages, nextTimeline));
    setPullStatus("Latest demo reports pulled.");
    recordSourceAudit(
      "demo",
      `Demo pull loaded ${sortedPackages.length} incident package(s).`,
      "success",
      sortedPackages.length,
    );
  }

  function handleExtractTranscript(text: string, presetId?: string) {
    if (!text.trim()) {
      setTranscriptExtractStatus(
        "No reports matched this transcript. Try a preset or add location and team details.",
      );
      return;
    }

    const activeIncidentIds = incidentPackages.map(({ incident }) => incident.id);
    const extraction = extractTranscriptIncidents({
      text,
      activeIncidentIds,
      sourceLabel: presetId ? "Preset" : "Manual paste",
      presetId,
    });
    const currentBatch = loadDemoIncidentBatch();
    let nextPackages = [...incidentPackages];

    if (extraction.addedIncidents.length > 0) {
      nextPackages = sortIncidentPackages([
        ...nextPackages,
        ...extraction.addedIncidents.map(localStorageIncidentToPackage),
      ]);
      const mergedBatch = mergeAddedIncidentsIntoBatch(
        currentBatch,
        incidentPackages,
        extraction.addedIncidents,
      );
      if (mergedBatch) {
        saveDemoIncidentBatch(mergedBatch);
        setBatchGeneratedAt(mergedBatch.generatedAt);
      }
    }

    nextPackages = enrichPackagesWithTranscriptEvidence(
      nextPackages,
      extraction.record.matchedLines,
      extraction.record.extractedIncidentIds,
    );
    nextPackages = sortIncidentPackages(nextPackages);

    const activeIdSet = new Set(nextPackages.map(({ incident }) => incident.id));
    const filteredRecord: RadioTranscriptRecord = {
      ...extraction.record,
      logSnippets: extraction.record.logSnippets.filter((snippet) =>
        activeIdSet.has(snippet.incidentId),
      ),
    };

    const nextTimeline = appendTranscriptTimelineEntries(
      timeline,
      filteredRecord.logSnippets,
      filteredRecord.matchedLines,
      filteredRecord.addedIncidentIds,
    );

    saveRadioTranscriptRecord(filteredRecord);
    setLatestTranscriptRecord(filteredRecord);

    if (extraction.addedIncidents.length > 0) {
      setChangeSummary(buildChangeSummary(incidentPackages, nextPackages));
    }

    setIncidentPackages(nextPackages);
    setSelectedIncidentId((current) =>
      resolveSelectedIncidentId(nextPackages, current),
    );
    setTimeline(nextTimeline);
    setReportSummary(buildPostEventReport(nextPackages, nextTimeline));
    setTranscriptExtractStatus(
      buildExtractionStatusMessage(
        extraction.addedIds.length,
        extraction.matchedIncidentIds.length,
      ),
    );
    recordSourceAudit(
      "transcript",
      buildExtractionStatusMessage(
        extraction.addedIds.length,
        extraction.matchedIncidentIds.length,
      ),
      "success",
      nextPackages.length,
    );
  }

  function handleAutomaticIngest() {
    const result = runAutomaticIngestionPrototype({
      transcriptRecord: latestTranscriptRecord,
    });

    if ("error" in result) {
      setIngestionFallbackMessage(result.fallbackMessage);
      setAutomaticIngestStatus(result.error);
      return;
    }

    const normalized: NormalizedIngestionResult = {
      ...result,
      sourceMode: "automatic",
      ingestionSummary: `Automatic ingest prototype loaded ${result.incidentPackages.length} incident package(s).`,
    };
    applyNormalizedIngestion(normalized);
    setIngestionFallbackMessage(null);
    setAutomaticIngestStatus("Automatic ingest prototype completed.");
    setBatchGeneratedAt(new Date().toISOString());
  }

  const topPriority = incidentPackages[0]?.incident.priority ?? "Monitor";
  const latestEntry = selectedIncidentPackage
    ? [...timeline]
        .reverse()
        .find((entry) => entry.incidentId === selectedIncidentPackage.incident.id)
    : undefined;
  const latestSummary = getLatestDrawerText(
    selectedIncidentPackage?.incident.id,
    latestEntry,
  );

  const demoReportDraft = buildDemoReportDraft(
    incidentPackages,
    selectedIncidentPackage,
    timeline,
  );
  const demoMemorySummary = buildIncidentMemorySummary(
    incidentPackages,
    pullStatus,
    batchGeneratedAt,
  );
  const activeLocationIds = useMemo(
    () => getActiveLocationIdsFromPackages(incidentPackages),
    [incidentPackages],
  );

  const commandState = useMemo<CommandState>(
    () => ({
      incidentPackages,
      selectedIncidentPackage,
      timeline,
      changeSummary,
      batchGeneratedAt,
      pullStatus,
      reportSummary,
      demoReportDraft,
      demoMemorySummary,
      latestTranscript: latestTranscriptRecord,
      transcriptAddedTitles:
        latestTranscriptRecord?.addedIncidentIds.map((incidentId) =>
          resolveTranscriptTitle(incidentId, incidentPackages),
        ) ?? [],
      transcriptMatchedTitles:
        latestTranscriptRecord?.matchedIncidentIds.map((incidentId) =>
          resolveTranscriptTitle(incidentId, incidentPackages),
        ) ?? [],
      selectedResponseStages: selectedIncidentPackage
        ? buildResponseTimeline({
            incidentPackage: selectedIncidentPackage,
            timeline,
            transcriptLine:
              latestTranscriptRecord?.matchedLines[selectedIncidentPackage.incident.id] ??
              null,
          })
        : [],
      sourceMode,
      lastIngestionSummary,
      sourceAuditExcerpts: getRecentSourceAuditExcerpts(sourceAuditEvents),
    }),
    [
      incidentPackages,
      selectedIncidentPackage,
      timeline,
      changeSummary,
      batchGeneratedAt,
      pullStatus,
      reportSummary,
      demoReportDraft,
      demoMemorySummary,
      latestTranscriptRecord,
      sourceMode,
      lastIngestionSummary,
      sourceAuditEvents,
    ],
  );

  function openWorkspace(view: WorkspaceView) {
    setActiveWorkspace(view);
  }

  function toggleExpanded() {
    setActiveWorkspace((current) => (current ? null : "evidence"));
  }

  return (
    <div className="workbench-shell">
      <main className="workbench">
        <CommandHeader
          incidentCount={incidentPackages.length}
          topPriority={topPriority}
        />

        <IntakeContextBar
          onPullReports={handlePullLatestReports}
          pullStatus={pullStatus}
          batchCount={incidentPackages.length}
          topIncidentTitle={incidentPackages[0]?.incident.title ?? null}
          changeSummary={changeSummary}
          onExtractTranscript={handleExtractTranscript}
          transcriptExtractStatus={transcriptExtractStatus}
          latestTranscriptRecord={latestTranscriptRecord}
          ingestionFallbackMessage={ingestionFallbackMessage}
          automaticIngestEnabled={automaticIngestGate.enabled}
          automaticIngestReason={automaticIngestGate.reason}
          onAutomaticIngest={handleAutomaticIngest}
          automaticIngestStatus={automaticIngestStatus}
          operationsConnected={operationsConnected}
          onConnectOperations={() => void handleConnectOperationsData()}
          connectStatus={connectStatus}
          connectLoading={connectLoading}
          ingestionRefreshKey={ingestionRefreshKey}
        />

        <section className="board-grid">
          <div className="board-column min-h-0">
            <IncidentList
              incidentPackages={incidentPackages}
              selectedIncidentId={selectedIncidentId}
              onSelect={setSelectedIncidentId}
              emptyMessage={
                realDemoFlowEnabled && incidentPackages.length === 0
                  ? "No operations data connected. Connect stadium operations data to load current incidents from Elastic."
                  : null
              }
            />
          </div>

          <div className="board-column min-h-0">
            {selectedIncidentPackage ? (
              <ActiveIncidentWorkspace
                incidentPackage={selectedIncidentPackage}
                commandState={commandState}
                timeline={timeline}
                activeLocationIds={activeLocationIds}
                transcriptLine={
                  latestTranscriptRecord?.matchedLines[
                    selectedIncidentPackage.incident.id
                  ] ?? null
                }
                onApprove={handleApprove}
                onApplySentinelRecommendation={handleApplySentinelRecommendation}
              />
            ) : (
              <section className="ops-panel flex h-full min-h-0 flex-col overflow-hidden">
                <h2 className="ops-heading text-lg" data-testid="workspace-empty-title">
                  {realDemoFlowEnabled
                    ? "No operations data connected"
                    : "No incidents matched the current report"}
                </h2>
                <p className="mt-2 max-w-[60ch] text-sm leading-6 text-slate-600">
                  {realDemoFlowEnabled
                    ? "Connect stadium operations data to load current incidents from Elastic, then pull latest reports."
                    : "Use the demo scenario text to restore the dispatch queue, active incident workspace, and utility drawer workflow."}
                </p>
              </section>
            )}
          </div>
        </section>

        <IncidentDrawer
          activeWorkspace={activeWorkspace}
          latestSummary={latestSummary}
          onOpenWorkspace={openWorkspace}
          onToggleExpanded={toggleExpanded}
          evidencePanel={
            selectedIncidentPackage ? (
              <EvidencePanel incidentPackage={selectedIncidentPackage} />
            ) : (
              <div className="text-sm text-slate-500">
                Evidence appears when an incident is selected.
              </div>
            )
          }
          staffPanel={
            selectedIncidentPackage ? (
              <StaffUpdatePanel staffUpdate={selectedIncidentPackage.staffUpdate} />
            ) : (
              <div className="text-sm text-slate-500">
                Staff update appears when an incident is selected.
              </div>
            )
          }
          timelinePanel={
            <TimelinePanel
              timeline={timeline}
              incidentId={selectedIncidentPackage?.incident.id}
            />
          }
          reportPanel={
            <>
              <ReportInput
                report={report}
                isSubmitting={isSubmitting}
                queueNonEmpty={incidentPackages.length > 0}
                onChange={setReport}
                onSubmit={handleSubmit}
              />
              <PostEventReportPanel
                reportSummary={reportSummary}
                demoReportDraft={demoReportDraft}
                demoMemoryPanel={<DemoMemoryPanel memorySummary={demoMemorySummary} />}
              />
            </>
          }
          sourceLogPanel={<SourceLogPanel events={sourceAuditEvents} />}
        />
      </main>
    </div>
  );
}
