"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ActiveIncidentWorkspace } from "@/components/dashboard/active-incident-workspace";
import { CommandHeader } from "@/components/dashboard/command-header";
import { DemoMemoryPanel } from "@/components/dashboard/demo-memory-panel";
import { EvidencePanel } from "@/components/dashboard/evidence-panel";
import { IncidentDrawer } from "@/components/dashboard/incident-drawer";
import { IncidentList } from "@/components/dashboard/incident-list";
import { IntakeContextBar } from "@/components/dashboard/intake-context-bar";
import { PostEventReportPanel } from "@/components/dashboard/post-event-report-panel";
import { ReportInput } from "@/components/dashboard/report-input";
import {
  SentinelInline,
  type SentinelActionTrace,
  type SentinelUiState,
} from "@/components/dashboard/sentinel-inline";
import { SourceLogPanel } from "@/components/dashboard/source-log-panel";
import { StaffUpdatePanel } from "@/components/dashboard/staff-update-panel";
import { TimelinePanel } from "@/components/dashboard/timeline-panel";
import {
  checkRateLimit,
  clearDemoIncidentBatch,
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
import {
  buildEmptyCommandState,
  getRealDemoQueueEmptyMessage,
  getRealDemoWorkspaceEmptyBody,
  getRealDemoWorkspaceEmptyTitle,
} from "@/lib/command-empty-state";
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
import {
  isElasticPullEnabled,
  isRealDemoFlowEnabled,
  isSentinelVoiceEnabled,
} from "@/lib/feature-flags";
import {
  fetchManualIngestionResult,
  planManualReportIngestion,
} from "@/lib/manual-report-ingestion";
import { writeApprovedTimelineEntry } from "@/lib/timeline-write-client";
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
import { askSentinel } from "@/lib/sentinel-agent-client";
import {
  buildDefaultSentinelBrief,
  buildSentinelActionFailureMessage,
  buildSentinelReportDraft,
  interpretSentinelCommand,
  type CommandState,
  type SentinelCommandProposal,
} from "@/lib/sentinel-command-agent";
import {
  createSpeechRecognitionSession,
  normalizeVoiceTranscript,
  type SpeechRecognitionStatus,
} from "@/lib/sentinel-voice";
import { SENTINEL_MOCK_VOICE_QUESTION } from "@/lib/sentinel-voice-shell";
import type {
  EvidenceResult,
  IncidentPackage,
  ReportSummary,
  TimelineEntry,
} from "@/lib/types";

const realDemoFlowEnabled = isRealDemoFlowEnabled();
const sentinelVoiceEnabled = isSentinelVoiceEnabled();
const initialCommandState = realDemoFlowEnabled
  ? buildEmptyCommandState()
  : buildDemoState();
type WorkspaceView = "evidence" | "staff" | "timeline" | "report" | "source";
type ApprovalResult = {
  result: string;
  writebackStatus: string | null;
};

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

function buildCommandStripSummary(options: {
  operationsConnected: boolean;
  incidentCount: number;
  topIncidentTitle: string | null;
  pullStatus: string | null;
}): string {
  if (!options.operationsConnected) {
    return "Connect live operations data and review current incident reports.";
  }

  if (options.incidentCount === 0) {
    return "Live operations data connected. Pull latest reports to load incidents.";
  }

  return `Live operations data pulled. ${options.incidentCount} incidents loaded. Top priority: ${options.topIncidentTitle ?? "Operations review"}.`;
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
  const [pullLoading, setPullLoading] = useState(false);
  const [ingestionRefreshKey, setIngestionRefreshKey] = useState(0);
  const pullInFlightRef = useRef(false);
  const [sentinelOpen, setSentinelOpen] = useState(false);
  const [sentinelQuestion, setSentinelQuestion] = useState("");
  const [sentinelAnswer, setSentinelAnswer] = useState<string | null>(null);
  const [sentinelEvidence, setSentinelEvidence] = useState<EvidenceResult[]>([]);
  const [sentinelStatusMessage, setSentinelStatusMessage] = useState<string | null>(
    null,
  );
  const [sentinelUiState, setSentinelUiState] = useState<SentinelUiState>("idle");
  const [sentinelActionTrace, setSentinelActionTrace] =
    useState<SentinelActionTrace | null>(null);
  const [sentinelPendingAction, setSentinelPendingAction] =
    useState<SentinelCommandProposal | null>(null);
  const [sentinelVoiceStatus, setSentinelVoiceStatus] =
    useState<SpeechRecognitionStatus>("ready");
  const voiceSessionRef = useRef<ReturnType<typeof createSpeechRecognitionSession> | null>(
    null,
  );
  const sentinelUiStateRef = useRef<SentinelUiState>("idle");
  const lastVoiceSubmissionRef = useRef<{
    signature: string;
    timestamp: number;
  } | null>(null);
  const trackedSentinelIncidentId = useRef<string | null>(null);

  useEffect(() => {
    setSourcesConnected(readSourcesConnected());
    setOperationsConnected(readOperationsConnected());
  }, []);

  useEffect(() => {
    sentinelUiStateRef.current = sentinelUiState;
  }, [sentinelUiState]);

  useEffect(() => {
    const incidentId = selectedIncidentId || null;
    if (trackedSentinelIncidentId.current === null) {
      trackedSentinelIncidentId.current = incidentId;
      return;
    }

    if (trackedSentinelIncidentId.current === incidentId) {
      return;
    }

    trackedSentinelIncidentId.current = incidentId;
    setSentinelOpen(false);
    setSentinelQuestion("");
    setSentinelAnswer(null);
    setSentinelEvidence([]);
    setSentinelStatusMessage(null);
    setSentinelUiState("idle");
    setSentinelActionTrace(null);
    setSentinelPendingAction(null);
  }, [selectedIncidentId]);

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

  function resetRealDemoQueueState() {
    const emptyState = buildEmptyCommandState();
    setIncidentPackages(emptyState.incidentPackages);
    setSelectedIncidentId("");
    setTimeline(emptyState.timeline);
    setReportSummary(emptyState.reportSummary);
    setBatchGeneratedAt(null);
    setChangeSummary(null);
    setPullStatus(null);
    setSourceMode(null);
    setLastIngestionSummary(null);
  }

  // Read localStorage batch on mount (client-only — avoids hydration mismatch).
  // Real-demo mode never hydrates demo batches — only Pull populates the queue.
  useEffect(() => {
    setSourceAuditEvents(loadSourceAuditEvents());
    const transcriptRecord = loadRadioTranscriptRecord();
    setLatestTranscriptRecord(transcriptRecord);

    if (realDemoFlowEnabled) {
      clearDemoIncidentBatch();
      resetRealDemoQueueState();
      return;
    }

    const batch = loadDemoIncidentBatch();

    if (!batch) {
      if (transcriptRecord) {
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

  const selectedIncidentPackage = selectedIncidentId
    ? incidentPackages.find(({ incident }) => incident.id === selectedIncidentId)
    : undefined;

  async function handleSubmit(options?: { confirmedReplace?: boolean }) {
    const plan = planManualReportIngestion({
      reportText: report,
      queueNonEmpty: incidentPackages.length > 0,
      confirmedReplace: options?.confirmedReplace ?? false,
    });

    if (plan.type === "needs_confirmation") {
      return { status: "needs_confirmation" as const };
    }

    setIsSubmitting(true);

    try {
      const result = await fetchManualIngestionResult(report);
      applyNormalizedIngestion(result);
      return { status: "processed" as const };
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApprove(
    incidentId: string,
    action: string,
    actionIndex: number,
    options?: { sentinelRecommendationId?: string },
  ): Promise<ApprovalResult> {
    const nextIncidentPackages = updateIncidentPackages(
      incidentPackages,
      incidentId,
      actionIndex,
    );
    if (nextIncidentPackages === incidentPackages) {
      return {
        result: "Action already recorded for this incident.",
        writebackStatus: "No additional write-back needed.",
      };
    }
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
      return {
        result: "Action target is no longer available.",
        writebackStatus: "Command file not updated.",
      };
    }

    try {
      const result = await writeApprovedTimelineEntry({
        incidentId,
        actionIndex,
        actionLabel: action,
        actor: "Operations Lead",
        sentinelRecommendationId: options?.sentinelRecommendationId,
        incidentPackage: approvedPackage,
      });
      recordSourceAudit(
        result.elasticWritten ? "elastic" : "demo",
        result.sourceAuditSummary,
        result.elasticWritten ? "success" : "fallback",
        1,
      );
      return {
        result: `${action} recorded for ${approvedPackage.incident.title}.`,
        writebackStatus: result.elasticWritten
          ? "Elastic write-back complete."
          : "Recorded in the local command file.",
      };
    } catch {
      recordSourceAudit(
        "demo",
        `Local approval recorded for ${incidentId}; Elastic write-back unavailable.`,
        "fallback",
        1,
      );
      return {
        result: `${action} recorded for ${approvedPackage.incident.title}.`,
        writebackStatus: "Recorded locally while external write-back was unavailable.",
      };
    }
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
        clearDemoIncidentBatch();
        resetRealDemoQueueState();
        setConnectStatus(
          "Live operations data connected. Pull latest reports to load incidents.",
        );
        return;
      }

      if (result.outcome === "unconfigured") {
        setConnectStatus("Operations data is unavailable right now.");
        return;
      }

      setConnectStatus(
        result.errorSummary ?? "Could not connect stadium operations data.",
      );
    } catch {
      setConnectStatus("Could not connect stadium operations data.");
    } finally {
      setConnectLoading(false);
    }
  }

  async function handlePullLatestReports() {
    if (pullInFlightRef.current) {
      return;
    }

    const { allowed } = checkRateLimit();
    if (!allowed) {
      setPullStatus("Incidents are up to date. Try again shortly.");
      return;
    }

    pullInFlightRef.current = true;
    setPullLoading(true);
    setPullStatus("Pulling latest reports...");
    const previousPackages = incidentPackages;
    recordPull();

    try {
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
              `Live operations data pulled (${sortedPackages.length} incidents).`,
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
      setPullStatus(`Latest operations data loaded (${sortedPackages.length} incidents).`);
      recordSourceAudit(
        "demo",
        `Demo pull loaded ${sortedPackages.length} incident package(s).`,
        "success",
        sortedPackages.length,
      );
    } finally {
      pullInFlightRef.current = false;
      setPullLoading(false);
    }
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
  const commandStripSummary = buildCommandStripSummary({
    operationsConnected: realDemoFlowEnabled ? operationsConnected : sourcesConnected,
    incidentCount: incidentPackages.length,
    topIncidentTitle: incidentPackages[0]?.incident.title ?? null,
    pullStatus,
  });

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

  function getVoiceSession() {
    if (typeof window === "undefined") {
      return {
        isSupported: false,
        start: () => {},
        stop: () => {},
      };
    }

    if (!voiceSessionRef.current) {
      voiceSessionRef.current = createSpeechRecognitionSession({
        onTranscript: (text) => {
          void handleVoiceTranscript(text);
        },
        onStatusChange: (status, message) => {
          setSentinelVoiceStatus(status);
          const currentUiState = sentinelUiStateRef.current;

          // Handle "listening" first — before any guard — so starting voice from idle
          // (or any non-active state) still transitions to "listening" and sets the message.
          if (status === "listening") {
            setSentinelUiState("listening");
            setSentinelStatusMessage(message);
            return;
          }

          // For all other statuses only act when in a voice-active state so that
          // "ready"/"error" cannot stomp thinking/action_complete/etc.
          if (currentUiState !== "listening" && currentUiState !== "transcribing") {
            return;
          }

          if (status === "error") {
            setSentinelUiState("idle");
            setSentinelStatusMessage(message);
            return;
          }

          if (status === "ready") {
            // "ready" while "transcribing" = onend after captured transcript — don't touch state
            if (currentUiState === "transcribing") return;
            // "ready" while "listening" = recognition ended without a transcript
            if (currentUiState === "listening") {
              setSentinelUiState("idle");
            }
          }
        },
      });
    }

    return voiceSessionRef.current;
  }

  function openSentinel() {
    if (!selectedIncidentPackage) {
      return;
    }

    setSentinelOpen(true);
    if (!sentinelVoiceEnabled) {
      setSentinelUiState("idle");
      setSentinelStatusMessage(buildDefaultSentinelBrief(commandState));
      return;
    }

    const session = getVoiceSession();
    if (!session.isSupported) {
      setSentinelUiState("action_failed");
      setSentinelStatusMessage("Voice is unavailable in this browser. Type instead.");
      return;
    }

    setSentinelUiState("listening");
    setSentinelStatusMessage("Listening for an incident command.");
    session.start();
  }

  function closeSentinel() {
    voiceSessionRef.current?.stop();
    setSentinelOpen(false);
    setSentinelUiState("idle");
    setSentinelPendingAction(null);
  }

  function toggleSentinel() {
    if (sentinelOpen) {
      closeSentinel();
      return;
    }

    openSentinel();
  }

  function startSentinelVoice() {
    setSentinelOpen(true);
    const session = getVoiceSession();
    if (!session.isSupported) {
      setSentinelUiState("action_failed");
      setSentinelStatusMessage("Voice is unavailable in this browser. Type instead.");
      return;
    }

    setSentinelUiState("listening");
    setSentinelStatusMessage("Listening for an incident command.");
    session.start();
  }

  function stopSentinelVoice() {
    voiceSessionRef.current?.stop();
  }

  async function handleVoiceTranscript(text: string) {
    const transcript = text.trim();
    if (!transcript || !selectedIncidentPackage) {
      return;
    }

    const normalized = normalizeVoiceTranscript(transcript);
    if (!normalized) {
      return;
    }

    const signature = `${selectedIncidentPackage.incident.id}:${normalized}`;
    const now = Date.now();
    const lastSubmission = lastVoiceSubmissionRef.current;
    if (
      lastSubmission &&
      lastSubmission.signature === signature &&
      now - lastSubmission.timestamp < 1500
    ) {
      return;
    }

    lastVoiceSubmissionRef.current = { signature, timestamp: now };
    setSentinelQuestion(transcript);
    setSentinelOpen(true);
    setSentinelUiState("transcribing");
    setSentinelStatusMessage("Transcript ready. Submitting command.");
    voiceSessionRef.current?.stop();
    await submitSentinelQuestion(transcript);
  }

  function buildActionTrace(
    interpretedCommand: string,
    proposal: SentinelCommandProposal,
    result: string,
    writebackStatus?: string | null,
  ): SentinelActionTrace {
    return {
      interpretedCommand,
      selectedAction: proposal.label,
      target: proposal.targetLabel,
      result,
      writebackStatus: writebackStatus ?? null,
    };
  }

  async function executeSentinelAction(
    proposal: SentinelCommandProposal,
    interpretedCommand: string,
  ) {
    setSentinelPendingAction(null);
    setSentinelUiState("action_executing");
    setSentinelStatusMessage("Applying Sentinel action.");

    try {
      switch (proposal.type) {
        case "open_evidence":
          openWorkspace("evidence");
          setSentinelActionTrace(
            buildActionTrace(
              interpretedCommand,
              proposal,
              "Evidence opened for the selected incident.",
            ),
          );
          setSentinelUiState("action_complete");
          return;
        case "open_source_log":
          openWorkspace("source");
          setSentinelActionTrace(
            buildActionTrace(
              interpretedCommand,
              proposal,
              "Source log opened in the workspace drawer.",
            ),
          );
          setSentinelUiState("action_complete");
          return;
        case "open_report":
          openWorkspace("report");
          setSentinelActionTrace(
            buildActionTrace(
              interpretedCommand,
              proposal,
              "Report opened in the workspace drawer.",
            ),
          );
          setSentinelUiState("action_complete");
          return;
        case "draft_report": {
          const draft =
            proposal.draftText ?? buildSentinelReportDraft(commandState, sentinelAnswer);
          setReport(draft);
          openWorkspace("report");
          setSentinelActionTrace(
            buildActionTrace(
              interpretedCommand,
              proposal,
              "Report draft added to the visible report field.",
            ),
          );
          setSentinelUiState("action_complete");
          return;
        }
        case "process_report": {
          const draft =
            proposal.draftText ?? buildSentinelReportDraft(commandState, sentinelAnswer);
          setReport(draft);
          openWorkspace("report");
          const result = await handleSubmit({ confirmedReplace: true });
          const resultText =
            result?.status === "processed"
              ? "Report processed and the command board refreshed."
              : "Report is ready for review in the visible report field.";
          setSentinelActionTrace(buildActionTrace(interpretedCommand, proposal, resultText));
          setSentinelUiState("action_complete");
          return;
        }
        case "dispatch_team":
        case "advance_checklist": {
          const selected = selectedIncidentPackage;
          if (!selected || proposal.actionIndex === undefined) {
            throw new Error("No action target is selected.");
          }

          const action =
            selected.incident.recommendedActions[proposal.actionIndex] ?? proposal.label;
          const approval = await handleApprove(
            selected.incident.id,
            action,
            proposal.actionIndex,
          );
          openWorkspace("timeline");
          setSentinelActionTrace(
            buildActionTrace(
              interpretedCommand,
              proposal,
              approval.result,
              approval.writebackStatus,
            ),
          );
          setSentinelUiState("action_complete");
          return;
        }
        case "select_top_incident": {
          const topIncident = incidentPackages[0];
          if (!topIncident) {
            throw new Error("No incidents are available.");
          }
          setSelectedIncidentId(topIncident.incident.id);
          setSentinelActionTrace(
            buildActionTrace(
              interpretedCommand,
              proposal,
              `${topIncident.incident.title} is now highlighted in the queue.`,
            ),
          );
          setSentinelUiState("action_complete");
          return;
        }
        case "recommend_next_action": {
          const selected = selectedIncidentPackage;
          const actionLabel =
            selected && proposal.actionIndex !== undefined
              ? selected.incident.recommendedActions[proposal.actionIndex] ?? proposal.label
              : proposal.label;
          setSentinelActionTrace(
            buildActionTrace(
              interpretedCommand,
              proposal,
              `Next action: ${actionLabel}.`,
            ),
          );
          setSentinelUiState("action_complete");
          return;
        }
        default:
          throw new Error("Sentinel action is not supported.");
      }
    } catch {
      setSentinelActionTrace(
        buildActionTrace(
          interpretedCommand,
          proposal,
          buildSentinelActionFailureMessage(commandState),
        ),
      );
      setSentinelUiState("action_failed");
    }
  }

  async function submitSentinelQuestion(questionOverride?: string) {
    const selected = selectedIncidentPackage;
    const interpretedCommand = (questionOverride ?? sentinelQuestion).trim();
    if (!selected || !interpretedCommand) {
      return;
    }

    setSentinelQuestion(interpretedCommand);
    setSentinelOpen(true);
    setSentinelPendingAction(null);
    setSentinelActionTrace(null);
    setSentinelUiState("thinking");
    setSentinelStatusMessage("Sentinel is reviewing the current command state.");

    try {
      const response = await askSentinel({
        question: interpretedCommand,
        incidentId: selected.incident.id,
        context: {
          incidentPackage: selected,
          timeline: commandState.timeline.filter(
            (entry) => entry.incidentId === selected.incident.id,
          ),
          queueTitles: commandState.incidentPackages
            .slice(0, 8)
            .map(({ incident }) => incident.title),
          sourceMode: commandState.sourceMode,
          pullStatus: commandState.pullStatus,
        },
      });

      setSentinelAnswer(response.answer);
      setSentinelEvidence(response.evidence);

      const proposal = interpretSentinelCommand(
        interpretedCommand,
        commandState,
        response.answer,
      );
      if (proposal) {
        if (proposal.requiresConfirmation) {
          setSentinelPendingAction(proposal);
          setSentinelActionTrace(
            buildActionTrace(
              interpretedCommand,
              proposal,
              "Ready to apply in the current workspace.",
            ),
          );
          setSentinelUiState("action_proposed");
          setSentinelStatusMessage("Review the proposed action and apply when ready.");
          return;
        }

        await executeSentinelAction(proposal, interpretedCommand);
        return;
      }

      setSentinelUiState("idle");
      setSentinelStatusMessage(
        response.meta.geminiMode === "live"
          ? "Live response ready."
          : "Review response ready.",
      );
    } catch {
      const fallback = buildDefaultSentinelBrief(commandState);
      setSentinelAnswer(fallback);
      setSentinelEvidence(selected.evidence);
      setSentinelUiState("action_failed");
      setSentinelStatusMessage("Sentinel returned a review response. Type or retry the command.");
    }
  }

  async function applyPendingSentinelAction() {
    if (!sentinelPendingAction) {
      return;
    }

    await executeSentinelAction(sentinelPendingAction, sentinelQuestion);
  }

  function openWorkspace(view: WorkspaceView) {
    setActiveWorkspace(view);
  }

  function toggleExpanded() {
    setActiveWorkspace((current) => (current ? null : "evidence"));
  }

  return (
    <div className="workbench-shell">
      <main
        className="workbench"
        data-real-demo-flow={realDemoFlowEnabled ? "true" : "false"}
        data-operations-connected={operationsConnected ? "true" : "false"}
        data-incidents-pulled={incidentPackages.length > 0 ? "true" : "false"}
      >
        <CommandHeader
          incidentCount={incidentPackages.length}
          topPriority={topPriority}
        />

        <IntakeContextBar
          onPullReports={handlePullLatestReports}
          pullStatus={pullStatus}
          batchCount={incidentPackages.length}
          operationsConnected={operationsConnected}
          onConnectOperations={() => void handleConnectOperationsData()}
          connectStatus={connectStatus}
          connectLoading={connectLoading}
          pullLoading={pullLoading}
          sourceSummary={commandStripSummary}
          onExtractTranscript={handleExtractTranscript}
          transcriptExtractStatus={transcriptExtractStatus}
          latestTranscriptRecord={latestTranscriptRecord}
          sentinelControl={
            <SentinelInline
              available={Boolean(selectedIncidentPackage)}
              open={sentinelOpen}
              voiceEnabled={sentinelVoiceEnabled}
              voiceUnsupported={sentinelVoiceStatus === "unsupported"}
              state={sentinelUiState}
              statusMessage={sentinelStatusMessage}
              questionInput={sentinelQuestion}
              answer={sentinelAnswer}
              evidence={sentinelEvidence}
              actionTrace={sentinelActionTrace}
              canApplyAction={Boolean(sentinelPendingAction)}
              onToggle={toggleSentinel}
              onQuestionChange={setSentinelQuestion}
              onSubmit={() => void submitSentinelQuestion()}
              onStartVoice={startSentinelVoice}
              onStopVoice={stopSentinelVoice}
              onMockVoice={() => setSentinelQuestion(SENTINEL_MOCK_VOICE_QUESTION)}
              onApplyAction={() => void applyPendingSentinelAction()}
            />
          }
        />

        <section className="board-grid">
          <div className="board-column min-h-0">
            <IncidentList
              incidentPackages={incidentPackages}
              selectedIncidentId={selectedIncidentId}
              onSelect={setSelectedIncidentId}
              emptyMessage={
                realDemoFlowEnabled && incidentPackages.length === 0
                  ? getRealDemoQueueEmptyMessage(operationsConnected)
                  : null
              }
            />
          </div>

          <div className="board-column min-h-0">
            {selectedIncidentPackage ? (
              <ActiveIncidentWorkspace
                incidentPackage={selectedIncidentPackage}
                timeline={timeline}
                onApprove={(incidentId, action, actionIndex) => {
                  void handleApprove(incidentId, action, actionIndex);
                }}
              />
            ) : (
              <section className="ops-panel flex h-full min-h-0 flex-col overflow-hidden">
                <h2 className="ops-heading text-lg" data-testid="workspace-empty-title">
                  {realDemoFlowEnabled
                    ? getRealDemoWorkspaceEmptyTitle(operationsConnected)
                    : "No incidents matched the current report"}
                </h2>
                <p className="mt-2 max-w-[60ch] text-sm leading-6 text-slate-600">
                  {realDemoFlowEnabled
                    ? getRealDemoWorkspaceEmptyBody(operationsConnected)
                    : "Use the current report to restore the dispatch queue, active incident workspace, and utility drawer workflow."}
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
              incidentPackage={selectedIncidentPackage}
              timeline={timeline}
              activeWorkspace={activeWorkspace}
              reportDraft={report}
              sentinelActionTrace={sentinelActionTrace}
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
                demoMemoryPanel={<DemoMemoryPanel memorySummary={demoMemorySummary} />}
              />
            </>
          }
          sourceLogPanel={
            <SourceLogPanel
              events={sourceAuditEvents}
              incidentPackage={selectedIncidentPackage}
            />
          }
        />
      </main>
    </div>
  );
}
