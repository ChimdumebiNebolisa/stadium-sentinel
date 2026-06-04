import { buildDeterministicPackage } from "@/lib/action-plan";
import { maybeRefineIncidentPackage, maybeRefineReportSummary } from "@/lib/agent/gemini";
import { demoScenario, locationRecords } from "@/lib/data";
import { retrieveOperationalEvidenceWithContext } from "@/lib/evidence";
import { parseIncidentReport } from "@/lib/incident-parser";
import { buildPostEventReport, buildTimelineSeed } from "@/lib/report";
import type { AgentRunResult, IncidentPackage } from "@/lib/types";

async function buildIncidentPackages(report: string): Promise<{
  incidentPackages: IncidentPackage[];
  retrievalMode: "elastic" | "local";
  geminiMode: "live" | "fallback";
}> {
  const incidents = parseIncidentReport(report, locationRecords);
  const incidentPackages: IncidentPackage[] = [];
  let retrievalMode: "elastic" | "local" = "local";
  let geminiMode: "live" | "fallback" = "fallback";

  for (const incident of incidents) {
    const retrieval = await retrieveOperationalEvidenceWithContext({
      incidentTitle: incident.title,
      incidentCategory: incident.category,
      locationName: incident.locationLabel,
      priority: incident.priority,
      reportText: report,
    });
    const deterministicPackage = buildDeterministicPackage(
      incident,
      retrieval.evidence,
    );
    const refined = await maybeRefineIncidentPackage(deterministicPackage);

    if (retrieval.mode === "elastic") {
      retrievalMode = "elastic";
    }

    if (refined.mode === "live") {
      geminiMode = "live";
    }

    incidentPackages.push(refined.incidentPackage);
  }

  return {
    incidentPackages,
    retrievalMode,
    geminiMode,
  };
}

export async function runStadiumAgent(
  report: string = demoScenario.inputReport,
): Promise<AgentRunResult> {
  const normalizedReport = report.trim() || demoScenario.inputReport;
  const { incidentPackages, retrievalMode, geminiMode } =
    await buildIncidentPackages(normalizedReport);
  const timeline = buildTimelineSeed(incidentPackages);
  const initialReportSummary = buildPostEventReport(incidentPackages, timeline);
  const refinedReport = await maybeRefineReportSummary(
    initialReportSummary,
    incidentPackages,
  );

  return {
    report: normalizedReport,
    incidentPackages,
    timeline,
    reportSummary: refinedReport.reportSummary,
    meta: {
      retrievalMode,
      geminiMode: refinedReport.mode === "live" ? "live" : geminiMode,
      elasticMcpMode: "unused",
    },
  };
}
