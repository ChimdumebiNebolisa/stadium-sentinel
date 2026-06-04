import { buildDeterministicPackage } from "@/lib/action-plan";
import { demoScenario, locationRecords } from "@/lib/data";
import { getLocalOperationalEvidence } from "@/lib/elastic/search";
import { parseIncidentReport } from "@/lib/incident-parser";
import { buildPostEventReport, buildTimelineSeed } from "@/lib/report";

export function buildDemoState(report: string = demoScenario.inputReport) {
  const incidents = parseIncidentReport(report, locationRecords);
  const incidentPackages = incidents.map((incident) =>
    buildDeterministicPackage(
      incident,
      getLocalOperationalEvidence({
        incidentTitle: incident.title,
        incidentCategory: incident.category,
        locationName: incident.locationLabel,
        priority: incident.priority,
        reportText: report,
      }),
    ),
  );
  const timeline = buildTimelineSeed(incidentPackages);
  const reportSummary = buildPostEventReport(incidentPackages, timeline);

  return {
    report,
    incidentPackages,
    timeline,
    reportSummary,
  };
}
