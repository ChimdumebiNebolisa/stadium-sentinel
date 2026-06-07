import type { IncidentPackage } from "@/lib/types";

export type SentinelExplanation = {
  whyPriority: string;
  whyTeam: string;
  whyEvidence: string;
  nextAction: string;
};

function formatLabel(value: string): string {
  return value.replace(/-/g, " ");
}

function buildFallbackExplanation(pkg: IncidentPackage): SentinelExplanation {
  const { incident, evidence } = pkg;

  return {
    whyPriority: `${incident.priority} priority for a ${formatLabel(incident.category)} incident at ${incident.locationLabel}.`,
    whyTeam: `${incident.assignedRole} is assigned for ${formatLabel(incident.incidentType)} response.`,
    whyEvidence:
      evidence[0]?.excerpt ??
      incident.rawText ??
      "Based on the current incident file.",
    nextAction:
      incident.recommendedActions[0] ??
      "Review the incident package and confirm the next dispatch step.",
  };
}

export function buildSentinelExplanation(
  incidentPackage: IncidentPackage,
): SentinelExplanation {
  const { assumptions } = incidentPackage.incident;

  if (assumptions.length === 0) {
    return buildFallbackExplanation(incidentPackage);
  }

  const fallback = buildFallbackExplanation(incidentPackage);

  return {
    whyPriority: assumptions[0] ?? fallback.whyPriority,
    whyTeam: assumptions[1] ?? fallback.whyTeam,
    whyEvidence: assumptions[2] ?? fallback.whyEvidence,
    nextAction: assumptions[3] ?? fallback.nextAction,
  };
}
