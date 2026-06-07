import { buildDemoState } from "@/lib/demo";
import {
  normalizeFromAgentRun,
  normalizeFromDemoState,
} from "@/lib/command-state-normalizer";
import type { NormalizedIngestionResult } from "@/lib/source-mode";
import type { AgentRunResult } from "@/lib/types";

export type ManualIngestionOptions = {
  reportText: string;
  queueNonEmpty: boolean;
  confirmedReplace: boolean;
};

export type ManualIngestionPlan =
  | { type: "needs_confirmation" }
  | { type: "apply"; result: NormalizedIngestionResult };

export function planManualReportIngestion(
  options: ManualIngestionOptions,
): ManualIngestionPlan {
  if (options.queueNonEmpty && !options.confirmedReplace) {
    return { type: "needs_confirmation" };
  }

  return {
    type: "apply",
    result: normalizeFromDemoState(options.reportText, "manual"),
  };
}

export function buildManualIngestionFromAgent(
  agentResult: AgentRunResult,
): NormalizedIngestionResult {
  return normalizeFromAgentRun(agentResult, "manual", "success");
}

export function buildManualIngestionFallback(
  reportText: string,
): NormalizedIngestionResult {
  return normalizeFromDemoState(reportText, "manual");
}

export async function fetchManualIngestionResult(
  reportText: string,
): Promise<NormalizedIngestionResult> {
  try {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report: reportText }),
    });

    if (!response.ok) {
      throw new Error("Agent refresh failed.");
    }

    const agentResult = (await response.json()) as AgentRunResult;
    return buildManualIngestionFromAgent(agentResult);
  } catch {
    return buildManualIngestionFallback(reportText);
  }
}

/** Test helper for deterministic manual ingest without network. */
export function resolveManualIngestionLocally(
  reportText: string,
): NormalizedIngestionResult {
  const state = buildDemoState(reportText);
  return normalizeFromAgentRun(
    {
      report: state.report,
      incidentPackages: state.incidentPackages,
      timeline: state.timeline,
      reportSummary: state.reportSummary,
      meta: {
        retrievalMode: "local",
        geminiMode: "fallback",
        elasticMcpMode: "unused",
      },
    },
    "manual",
    "success",
  );
}
