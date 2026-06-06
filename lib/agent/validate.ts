import { locationRecords, staffRoleRecords } from "@/lib/data";
import type {
  AgentJsonResponse,
  IncidentPackage,
  PriorityLevel,
  ValidatedAgentIncident,
  ValidatedAgentResponse,
} from "@/lib/types";

const ALLOWED_SEVERITIES = new Set<PriorityLevel>([
  "Immediate",
  "High",
  "Moderate",
  "Monitor",
]);

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function requireNonEmptyString(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function requireStringList(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array.`);
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    throw new Error(`${fieldName} must contain at least one string.`);
  }

  return normalized;
}

function normalizeLocation(
  locationId: string,
  locationLabel: string,
): { label: string; locationId: string } {
  const normalizedId = normalizeText(locationId);
  const normalizedLabel = normalizeText(locationLabel);
  const location = locationRecords.find((candidate) => {
    return (
      normalizeText(candidate.id) === normalizedId ||
      normalizeText(candidate.name) === normalizedLabel ||
      normalizeText(candidate.displayName) === normalizedLabel ||
      candidate.aliases.some((alias) => normalizeText(alias) === normalizedLabel)
    );
  });

  if (!location) {
    throw new Error(`Unknown location: ${locationId} / ${locationLabel}`);
  }

  return {
    label: location.name,
    locationId: location.id,
  };
}

function normalizeTeam(value: string): string {
  const normalized = normalizeText(value);
  const knownTeams = new Set(
    [
      ...locationRecords.flatMap((location) => location.defaultTeams),
      ...staffRoleRecords.map((role) => role.team),
    ].map((team) => normalizeText(team)),
  );
  const directMatch = [...knownTeams].find((team) => team === normalized);

  if (!directMatch) {
    return value.trim();
  }

  const canonical =
    locationRecords
      .flatMap((location) => location.defaultTeams)
      .find((team) => normalizeText(team) === normalized) ??
    staffRoleRecords.find((role) => normalizeText(role.team) === normalized)?.team;

  return canonical ?? value.trim();
}

function validateIncident(
  value: unknown,
  baselineIds: Set<string>,
): ValidatedAgentIncident {
  if (!value || typeof value !== "object") {
    throw new Error("Incident entry must be an object.");
  }

  const candidate = value as Record<string, unknown>;
  const id = requireNonEmptyString(candidate.id, "incident.id");

  if (!baselineIds.has(id)) {
    throw new Error(`Unexpected incident id: ${id}`);
  }

  const severity = requireNonEmptyString(candidate.severity, "incident.severity");

  if (!ALLOWED_SEVERITIES.has(severity as PriorityLevel)) {
    throw new Error(`Invalid incident.severity: ${severity}`);
  }

  const location = normalizeLocation(
    requireNonEmptyString(candidate.locationId, "incident.locationId"),
    requireNonEmptyString(candidate.locationLabel, "incident.locationLabel"),
  );
  const team = requireNonEmptyString(candidate.team, "incident.team");

  return {
    id,
    title: requireNonEmptyString(candidate.title, "incident.title"),
    queueTitle: requireNonEmptyString(candidate.queueTitle, "incident.queueTitle"),
    severity: severity as PriorityLevel,
    locationId: location.locationId,
    locationLabel: location.label,
    venueLayer: requireNonEmptyString(candidate.venueLayer, "incident.venueLayer"),
    team: team,
    normalizedTeam: normalizeTeam(team),
    riskTags: requireStringList(candidate.riskTags, "incident.riskTags"),
    recommendedActions: requireStringList(
      candidate.recommendedActions,
      "incident.recommendedActions",
    ),
    priorityRationale: requireNonEmptyString(
      candidate.priorityRationale,
      "incident.priorityRationale",
    ),
    evidence: requireStringList(candidate.evidence, "incident.evidence"),
  };
}

export function validateAgentResponse(
  raw: string,
  baselineIncidentPackages: IncidentPackage[],
): ValidatedAgentResponse {
  const parsed = JSON.parse(raw) as Partial<AgentJsonResponse>;

  if (!Array.isArray(parsed.incidents)) {
    throw new Error("incidents must be an array.");
  }

  if (parsed.incidents.length === 0) {
    throw new Error("incidents must contain at least one item.");
  }

  if (parsed.incidents.length !== baselineIncidentPackages.length) {
    throw new Error("incidents length must match the deterministic baseline.");
  }

  const baselineIds = new Set(
    baselineIncidentPackages.map(({ incident }) => incident.id),
  );
  const validatedIncidents = parsed.incidents.map((incident) =>
    validateIncident(incident, baselineIds),
  );
  const validatedIds = new Set(validatedIncidents.map((incident) => incident.id));

  if (validatedIds.size !== baselineIncidentPackages.length) {
    throw new Error("incidents must not contain duplicate ids.");
  }

  const byId = new Map(validatedIncidents.map((incident) => [incident.id, incident]));
  const orderedIncidents = baselineIncidentPackages.map(({ incident }) => {
    const match = byId.get(incident.id);

    if (!match) {
      throw new Error(`Missing incident ${incident.id} in validated response.`);
    }

    return match;
  });

  return {
    incidents: orderedIncidents,
    latestUpdate: requireNonEmptyString(parsed.latestUpdate, "latestUpdate"),
    reportSummary: requireNonEmptyString(parsed.reportSummary, "reportSummary"),
  };
}
