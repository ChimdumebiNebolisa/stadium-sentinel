import { locationRecords } from "@/lib/data";
import type {
  AgentRetrievalResult,
  IncidentPackage,
  PriorityLevel,
} from "@/lib/types";

type VertexSchema = {
  enum?: string[];
  items?: VertexSchema;
  properties?: Record<string, VertexSchema>;
  required?: string[];
  type: "ARRAY" | "BOOLEAN" | "NUMBER" | "OBJECT" | "STRING";
};

const SEVERITIES: PriorityLevel[] = [
  "Immediate",
  "High",
  "Moderate",
  "Monitor",
];

function buildLocationRules() {
  return locationRecords.map((location) => ({
    id: location.id,
    label: location.name,
    aliases: location.aliases,
    zoneLayer:
      location.zoneLayer === "bowl"
        ? "Stands"
        : location.zoneLayer.charAt(0).toUpperCase() + location.zoneLayer.slice(1),
    defaultTeams: location.defaultTeams,
    operationalRisks: location.operationalRisks,
    accessibilityCritical: location.accessibilityCritical,
    crowdFlowCritical: location.crowdFlowCritical,
  }));
}

export function buildAgentResponseSchema(): VertexSchema {
  return {
    type: "OBJECT",
    required: ["incidents", "latestUpdate", "reportSummary"],
    properties: {
      incidents: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          required: [
            "id",
            "title",
            "queueTitle",
            "severity",
            "locationId",
            "locationLabel",
            "venueLayer",
            "team",
            "riskTags",
            "recommendedActions",
            "priorityRationale",
            "evidence",
          ],
          properties: {
            id: { type: "STRING" },
            title: { type: "STRING" },
            queueTitle: { type: "STRING" },
            severity: { type: "STRING", enum: SEVERITIES },
            locationId: { type: "STRING" },
            locationLabel: { type: "STRING" },
            venueLayer: { type: "STRING" },
            team: { type: "STRING" },
            riskTags: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
            recommendedActions: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
            priorityRationale: { type: "STRING" },
            evidence: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
          },
        },
      },
      latestUpdate: { type: "STRING" },
      reportSummary: { type: "STRING" },
    },
  };
}

export function buildAgentSystemPrompt(): string {
  return [
    "You are Stadium Sentinel's backend reasoning model for a soccer-stadium incident operations command center.",
    "You are enriching an existing deterministic incident split. Do not invent, merge, remove, or reorder incidents.",
    "Return strict JSON only. No markdown, no prose, no code fences, no commentary.",
    "Use the same incident ids and same incident count as the deterministic baseline.",
    "Severity must be one of Immediate, High, Moderate, or Monitor.",
    "Keep the product focused on incident operations. Do not mention maps, seat maps, ticketing, CRM workflows, confidence scores, or numeric scores.",
    "Recommended actions must be concise operational imperatives tied to the provided context.",
    "Use the known locations and teams when possible.",
  ].join(" ");
}

export function buildAgentUserPrompt(input: {
  report: string;
  incidentPackages: IncidentPackage[];
  retrieval: AgentRetrievalResult;
}): string {
  const baselineIncidents = input.incidentPackages.map(({ incident }) => ({
    id: incident.id,
    title: incident.title,
    incidentType: incident.incidentType,
    category: incident.category,
    priority: incident.priority,
    locationId: incident.locationId,
    locationLabel: incident.locationLabel,
    assignedRole: incident.assignedRole,
    recommendedActions: incident.recommendedActions,
  }));

  return JSON.stringify(
    {
      task: "Enrich the deterministic incidents with grounded operational wording.",
      rules: {
        preserveIncidentIds: true,
        preserveIncidentCount: true,
        allowedSeverities: SEVERITIES,
        noNumericScores: true,
        noMapSeatMapTicketingCrmLanguage: true,
      },
      rawReport: input.report,
      baselineIncidents,
      knownLocations: buildLocationRules(),
      retrievalMode: input.retrieval.mode,
      retrievalContext: {
        playbooks: input.retrieval.playbooks,
        locations: input.retrieval.locations,
        incidentExamples: input.retrieval.incidentExamples,
        evidence: input.retrieval.evidence,
      },
    },
    null,
    2,
  );
}
