import type { IncidentPackage, TimelineEntry } from "@/lib/types";

export type ChangeSummary = {
  added: string[];
  removed: string[];
  topPriorityTitle: string | null;
  topPriorityLevel: string | null;
  teamMixNote: string | null;
  lines: string[];
};

export type IncidentMemorySummary = {
  headline: string;
  lines: string[];
};

export type DemoReportDraft = {
  headline: string;
  markdown: string;
};

function uniqueTeams(packages: IncidentPackage[]): string[] {
  return [...new Set(packages.map(({ incident }) => incident.assignedRole))].sort();
}

function formatIncidentType(type: string): string {
  return type.replace(/-/g, " ");
}

export function buildChangeSummary(
  previousPackages: IncidentPackage[],
  nextPackages: IncidentPackage[],
): ChangeSummary {
  const previousIds = new Set(previousPackages.map(({ incident }) => incident.id));
  const nextIds = new Set(nextPackages.map(({ incident }) => incident.id));

  const added = nextPackages
    .filter(({ incident }) => !previousIds.has(incident.id))
    .map(({ incident }) => incident.title);
  const removed = previousPackages
    .filter(({ incident }) => !nextIds.has(incident.id))
    .map(({ incident }) => incident.title);

  const top = nextPackages[0]?.incident ?? null;
  const previousTeams = uniqueTeams(previousPackages).join(", ");
  const nextTeams = uniqueTeams(nextPackages).join(", ");
  const teamMixNote =
    previousTeams && nextTeams && previousTeams !== nextTeams
      ? `Team mix: ${nextTeams}`
      : null;

  const lines: string[] = [];

  if (added.length > 0) {
    lines.push(`New: ${added.join(", ")}`);
  } else {
    lines.push("New: none");
  }

  if (removed.length > 0) {
    lines.push(`No longer active: ${removed.join(", ")}`);
  } else {
    lines.push("No longer active: none");
  }

  if (top) {
    lines.push(`Top priority: ${top.title} (${top.priority})`);
  }

  if (teamMixNote) {
    lines.push(teamMixNote);
  }

  return {
    added,
    removed,
    topPriorityTitle: top?.title ?? null,
    topPriorityLevel: top?.priority ?? null,
    teamMixNote,
    lines,
  };
}

export function buildFollowUpQuestions(incidentPackage: IncidentPackage): string[] {
  const { incident } = incidentPackage;
  const questions: string[] = [];

  switch (incident.incidentType) {
    case "accessibility-assist":
      questions.push(
        `Do staff need an accessible route cleared near ${incident.locationLabel}?`,
      );
      questions.push("Is the guest currently with a host who can relay updates?");
      break;
    case "facility-outage":
      questions.push("Is the outage affecting guest movement nearby?");
      questions.push(
        `Has an alternate route been marked around ${incident.locationLabel}?`,
      );
      break;
    case "queue-congestion":
      questions.push("Has the queue reached the concourse entry?");
      questions.push(`Is overflow routing open for ${incident.locationLabel}?`);
      break;
    default:
      questions.push(
        `Does ${incident.assignedRole} have visibility on ${incident.locationLabel}?`,
      );
      break;
  }

  if (incident.priority === "Immediate") {
    questions.push(`Should ${incident.assignedRole} respond on radio now?`);
  } else if (incident.priority === "High") {
    questions.push(`Is ${incident.assignedRole} staged near ${incident.locationLabel}?`);
  }

  return questions.slice(0, 3);
}

export function buildDispatchMessage(incidentPackage: IncidentPackage): string {
  const { incident } = incidentPackage;
  const action = incident.recommendedActions[0] ?? "Review and respond";

  return [
    `${incident.assignedRole} dispatch`,
    `${incident.priority} priority`,
    incident.locationLabel,
    action,
  ].join(" | ");
}

export function buildIncidentMemorySummary(
  incidentPackages: IncidentPackage[],
  pullStatus: string | null,
  batchGeneratedAt: string | null,
): IncidentMemorySummary {
  const count = incidentPackages.length;
  const teams = uniqueTeams(incidentPackages);
  const top = incidentPackages[0]?.incident;

  const lines = [
    `${count} incident${count === 1 ? "" : "s"} in the current command batch.`,
    top ? `Highest priority: ${top.title} (${top.priority}).` : "No incidents loaded.",
    teams.length > 0 ? `Teams in play: ${teams.join(", ")}.` : "No teams assigned.",
    batchGeneratedAt
      ? `Batch saved at ${new Date(batchGeneratedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`
      : "Pull latest reports to populate the current command batch.",
    pullStatus ? `Last pull: ${pullStatus}` : "Pull latest reports to refresh the command batch.",
    "Command memory updates after each report pull or response action.",
  ];

  return {
    headline: "Recent command memory",
    lines,
  };
}

export function buildDemoReportDraft(
  incidentPackages: IncidentPackage[],
  selectedIncidentPackage: IncidentPackage | undefined,
  timeline: TimelineEntry[],
): DemoReportDraft {
  const incidentLines = incidentPackages.map(
    ({ incident }) =>
      `- ${incident.priority}: ${incident.title} at ${incident.locationLabel} | ${incident.assignedRole}`,
  );

  const selectedSection = selectedIncidentPackage
    ? [
        "",
        "## Selected incident focus",
        `- **${selectedIncidentPackage.incident.title}**`,
        `- Priority: ${selectedIncidentPackage.incident.priority}`,
        `- Team: ${selectedIncidentPackage.incident.assignedRole}`,
        `- Location: ${selectedIncidentPackage.incident.locationLabel}`,
        `- Type: ${formatIncidentType(selectedIncidentPackage.incident.incidentType)}`,
        "",
        "### Staff update",
        selectedIncidentPackage.staffUpdate || "No staff update drafted.",
        "",
        "### Evidence",
        ...(selectedIncidentPackage.evidence.length > 0
          ? selectedIncidentPackage.evidence.map((item) => `- ${item.excerpt}`)
          : ["- No evidence attached."]),
        "",
        "### Recommended actions",
        ...selectedIncidentPackage.incident.recommendedActions.map(
          (action) => `- ${action}`,
        ),
      ]
    : [];

  const selectedTimeline = selectedIncidentPackage
    ? timeline.filter(
        (entry) => entry.incidentId === selectedIncidentPackage.incident.id,
      )
    : [];

  const timelineSection =
    selectedTimeline.length > 0
      ? [
          "",
          "### Selected incident log",
          ...selectedTimeline.map(
            (entry) => `- ${entry.timestamp}: ${entry.message} (${entry.actor})`,
          ),
        ]
      : [];

  const allTimelineSection =
    timeline.length > 0
      ? [
          "",
          "## Full operations log",
          ...timeline.map(
            (entry) => `- ${entry.timestamp}: ${entry.message} (${entry.actor})`,
          ),
        ]
      : [];

  const markdown = [
    "# Operations Report Draft",
    "",
    "_Generated from the current operations command state._",
    "",
    "## Active incidents",
    ...(incidentLines.length > 0 ? incidentLines : ["- None loaded."]),
    ...selectedSection,
    ...timelineSection,
    ...allTimelineSection,
    "",
    "## Dispatch-ready message",
    selectedIncidentPackage
      ? buildDispatchMessage(selectedIncidentPackage)
      : "Select an incident to generate a dispatch message.",
  ].join("\n");

  return {
    headline: "Report draft ready",
    markdown,
  };
}
