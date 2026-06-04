import {
  getReportPriorityLabel,
  getTimelineTypeLabel,
} from "@/lib/priority";
import type { IncidentPackage, ReportSummary, TimelineEntry } from "@/lib/types";

export function buildTimelineSeed(incidentPackages: IncidentPackage[]): TimelineEntry[] {
  return incidentPackages.flatMap(({ incident }, index) => [
    {
      id: `${incident.id}-reported`,
      incidentId: incident.id,
      timestamp: `20:${14 + index}`,
      type: "reported",
      message: `${incident.title} reported from ${incident.locationLabel}.`,
      actor: "Report Intake",
    },
    {
      id: `${incident.id}-suggested`,
      incidentId: incident.id,
      timestamp: `20:${15 + index}`,
      type: "suggested",
      message: `${incident.assignedRole} assigned to ${incident.title.toLowerCase()}.`,
      actor: "Ops desk",
    },
  ]);
}

export function buildPostEventReport(
  incidentPackages: IncidentPackage[],
  timeline: TimelineEntry[],
): ReportSummary {
  const unresolvedItems = incidentPackages
    .filter(
      ({ incident }) =>
        incident.approvedActionIds.length < incident.recommendedActions.length,
    )
    .map(({ incident }) => `${incident.title} is still awaiting response steps.`);

  const recommendations = incidentPackages.map(
    ({ incident }) => {
      const priorityPhrase =
        incident.priority === "Monitor"
          ? "ongoing monitoring"
          : `${incident.priority.toLowerCase()}-priority follow-through`;

      return `${incident.locationLabel}: keep ${incident.assignedRole} coverage in place for ${priorityPhrase}.`;
    },
  );

  const markdown = [
    "# Stadium Sentinel Post-Event Report",
    "",
    "## Incident Summary",
    ...incidentPackages.map(
      ({ incident }) =>
        `- ${getReportPriorityLabel(incident)}: ${incident.title} at ${incident.locationLabel}`,
    ),
    "",
    "## Timeline Recap",
    ...timeline.map(
      (entry) => `- ${entry.timestamp} ${getTimelineTypeLabel(entry.type)}: ${entry.message}`,
    ),
    "",
    "## Unresolved Items",
    ...(unresolvedItems.length > 0 ? unresolvedItems.map((item) => `- ${item}`) : ["- None."]),
    "",
    "## Improvement Recommendations",
    ...recommendations.map((item) => `- ${item}`),
  ].join("\n");

  return {
    headline: "Report preview ready",
    unresolvedItems,
    recommendations,
    markdown,
  };
}
