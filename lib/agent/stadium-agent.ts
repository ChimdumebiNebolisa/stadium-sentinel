import { buildDeterministicAgentState } from "@/lib/agent/deterministic";
import { maybeGenerateAgentRefinement } from "@/lib/agent/gemini";
import { demoScenario } from "@/lib/data";
import { retrieveAgentContext } from "@/lib/evidence";
import { buildPostEventReport, buildTimelineSeed } from "@/lib/report";
import type { AgentRunResult } from "@/lib/types";

function isAgentBackendEnabled(): boolean {
  return process.env.AGENT_BACKEND_ENABLED === "true";
}

export async function runStadiumAgent(
  report: string = demoScenario.inputReport,
): Promise<AgentRunResult> {
  const baselineState = buildDeterministicAgentState(report);

  if (
    !isAgentBackendEnabled() ||
    baselineState.incidentPackages.length === 0
  ) {
    return {
      ...baselineState,
      meta: {
        retrievalMode: "local",
        geminiMode: "fallback",
        elasticMcpMode: "unused",
      },
    };
  }

  const retrieval = await retrieveAgentContext({
    report: baselineState.report,
    incidents: baselineState.incidentPackages.map(({ incident }) => ({
      id: incident.id,
      title: incident.title,
      category: incident.category,
      locationId: incident.locationId,
      locationLabel: incident.locationLabel,
      priority: incident.priority,
    })),
  });
  const refinement = await maybeGenerateAgentRefinement({
    incidentPackages: baselineState.incidentPackages,
    report: baselineState.report,
    retrieval,
  });
  const timeline = buildTimelineSeed(refinement.incidentPackages);
  const reportSummary = buildPostEventReport(
    refinement.incidentPackages,
    timeline,
  );

  return {
    report: baselineState.report,
    incidentPackages: refinement.incidentPackages,
    timeline,
    reportSummary,
    meta: {
      retrievalMode: retrieval.mode,
      geminiMode: refinement.mode,
      elasticMcpMode: "unused",
    },
  };
}
