import { buildDemoState } from "@/lib/demo";
import type { IngestPullResponse } from "@/lib/elastic/pull-types";
import type {
  IngestionOutcome,
  NormalizedIngestionResult,
  SourceMode,
} from "@/lib/source-mode";
import type {
  AgentRunResult,
  IncidentPackage,
  ReportSummary,
  TimelineEntry,
} from "@/lib/types";

function buildSummary(
  sourceMode: SourceMode,
  packageCount: number,
  outcome: IngestionOutcome,
): string {
  const prefix =
    outcome === "fallback"
      ? "Fallback local ingestion"
      : `${sourceMode} ingestion`;

  return `${prefix} applied ${packageCount} incident package${packageCount === 1 ? "" : "s"}.`;
}

export function normalizeFromAgentRun(
  result: AgentRunResult,
  sourceMode: SourceMode = "manual",
  outcome: IngestionOutcome = "success",
): NormalizedIngestionResult {
  return {
    incidentPackages: result.incidentPackages,
    timeline: result.timeline,
    reportSummary: result.reportSummary,
    sourceMode,
    ingestionSummary: buildSummary(
      sourceMode,
      result.incidentPackages.length,
      outcome,
    ),
    outcome,
  };
}

export function normalizeFromDemoState(
  report: string,
  sourceMode: SourceMode = "manual",
): NormalizedIngestionResult {
  const state = buildDemoState(report);

  return {
    incidentPackages: state.incidentPackages,
    timeline: state.timeline,
    reportSummary: state.reportSummary,
    sourceMode,
    ingestionSummary: buildSummary(
      sourceMode,
      state.incidentPackages.length,
      "fallback",
    ),
    outcome: "fallback",
  };
}

export function normalizeDemoBatch(
  incidentPackages: IncidentPackage[],
  timeline: TimelineEntry[],
  reportSummary: ReportSummary,
): NormalizedIngestionResult {
  return {
    incidentPackages,
    timeline,
    reportSummary,
    sourceMode: "demo",
    ingestionSummary: buildSummary("demo", incidentPackages.length, "success"),
    outcome: "success",
  };
}

export function normalizeTranscriptIngestion(
  incidentPackages: IncidentPackage[],
  timeline: TimelineEntry[],
  reportSummary: ReportSummary,
  summary: string,
): NormalizedIngestionResult {
  return {
    incidentPackages,
    timeline,
    reportSummary,
    sourceMode: "transcript",
    ingestionSummary: summary,
    outcome: "success",
  };
}

export function normalizeFromElasticPull(
  response: IngestPullResponse,
): NormalizedIngestionResult {
  return {
    incidentPackages: response.incidentPackages,
    timeline: response.timeline,
    reportSummary: response.reportSummary,
    sourceMode: response.sourceMode,
    ingestionSummary: response.ingestionSummary,
    outcome: response.outcome,
  };
}

/** Skeleton hook for future elastic/automatic normalizers. */
export function createIngestionSkeleton(
  sourceMode: SourceMode,
  ingestionSummary: string,
): Pick<NormalizedIngestionResult, "sourceMode" | "ingestionSummary"> {
  return { sourceMode, ingestionSummary };
}
