import { buildDeterministicPackage } from "@/lib/action-plan";
import { demoScenario, locationRecords } from "@/lib/data";
import { getLocalOperationalEvidence } from "@/lib/elastic/search";
import { parseIncidentReport } from "@/lib/incident-parser";
import { buildPostEventReport, buildTimelineSeed } from "@/lib/report";

export function buildDeterministicAgentState(
  report: string = demoScenario.inputReport,
) {
  const normalizedReport = report.trim() || demoScenario.inputReport;
  const incidents = parseIncidentReport(normalizedReport, locationRecords);
  const incidentPackages = incidents.map((incident) =>
    buildDeterministicPackage(
      incident,
      getLocalOperationalEvidence({
        incidentTitle: incident.title,
        incidentCategory: incident.category,
        locationName: incident.locationLabel,
        priority: incident.priority,
        reportText: normalizedReport,
      }),
    ),
  );
  const timeline = buildTimelineSeed(incidentPackages);
  const reportSummary = buildPostEventReport(incidentPackages, timeline);

  return {
    report: normalizedReport,
    incidentPackages,
    timeline,
    reportSummary,
  };
}
