import type {
  IncidentPackage,
  ValidatedAgentResponse,
} from "@/lib/types";

export function applyAgentResponseToIncidentPackages(
  baselineIncidentPackages: IncidentPackage[],
  validatedResponse: ValidatedAgentResponse,
): IncidentPackage[] {
  const incidentsById = new Map(
    validatedResponse.incidents.map((incident) => [incident.id, incident]),
  );

  return baselineIncidentPackages.map((incidentPackage) => {
    const enrichedIncident = incidentsById.get(incidentPackage.incident.id);

    if (!enrichedIncident) {
      return incidentPackage;
    }

    return {
      ...incidentPackage,
      incident: {
        ...incidentPackage.incident,
        title: enrichedIncident.title,
        locationId: enrichedIncident.locationId,
        locationLabel: enrichedIncident.locationLabel,
        priority: enrichedIncident.severity,
        recommendedActions: enrichedIncident.recommendedActions,
      },
      staffUpdate: validatedResponse.latestUpdate || incidentPackage.staffUpdate,
    };
  });
}
