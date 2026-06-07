import { comparePriority } from "@/lib/priority";
import { buildPostEventReport, buildTimelineSeed } from "@/lib/report";
import { sortIncidentPackages } from "@/lib/radio-transcript-intake";
import type {
  EvidenceResult,
  EvidenceSourceType,
  IncidentPackage,
} from "@/lib/types";

import type {
  ElasticActiveIncident,
  ElasticEvidenceDocument,
  ElasticFacilityStatus,
  ElasticGateFlowLog,
  ElasticGuestAssistanceRequest,
  ElasticPolicyDocument,
  ElasticPullRelatedContext,
  ElasticRadioTranscript,
  IngestPullResponse,
} from "@/lib/elastic/pull-types";

function recommendedActionsForTeam(team: string): string[] {
  const normalized = team.toLowerCase();
  if (normalized.includes("guest")) {
    return ["Dispatch Guest Services", "Route details", "Confirm resolution"];
  }
  if (normalized.includes("security") || normalized.includes("crowd")) {
    return ["Dispatch Security", "Open overflow route", "Monitor queue"];
  }
  if (normalized.includes("facilit")) {
    return ["Dispatch Facilities", "Isolate affected area", "Log maintenance ticket"];
  }
  return ["Dispatch team", "Route details", "Confirm resolution"];
}

function buildAssumptions(incident: ElasticActiveIncident): string[] {
  const priorityReason: Record<ElasticActiveIncident["priority"], string> = {
    Immediate:
      "Triaged as Immediate. Guest safety or accessibility requires an immediate response.",
    High: "Triaged as High. Operational disruption is affecting multiple guests or a key area.",
    Moderate: "Triaged as Moderate. Localized issue with a known resolution path.",
    Monitor: "Triaged as Monitor. Limited operational impact; continue tracking for escalation.",
  };
  const actions = recommendedActionsForTeam(incident.assignedRole);
  return [
    priorityReason[incident.priority],
    `${incident.assignedRole} assigned. Best match for this incident type based on the dispatch runbook.`,
    `Reported at ${incident.reportedAt}.`,
    `Recommended next action: ${actions[0]}.`,
  ];
}

function mapSourceType(value: string): EvidenceSourceType {
  if (value === "radio_log") return "radio_log";
  if (value === "policy") return "policy";
  if (value === "runbook") return "runbook";
  if (value === "historical_incident") return "historical_incident";
  if (value === "location") return "location";
  if (value === "staff_rule") return "staff_rule";
  return "policy";
}

function evidenceFromDocument(document: ElasticEvidenceDocument): EvidenceResult {
  return {
    title: document.excerpt.slice(0, 80),
    sourceType: mapSourceType(document.sourceType),
    excerpt: document.excerpt,
    rationale: document.body,
    sourceId: document.id,
  };
}

function evidenceFromPolicy(document: ElasticPolicyDocument): EvidenceResult {
  return {
    title: document.title,
    sourceType: "policy",
    excerpt: document.excerpt,
    rationale: document.body,
    sourceId: document.id,
  };
}

function evidenceFromGuestAssistance(
  document: ElasticGuestAssistanceRequest,
): EvidenceResult {
  return {
    title: `Guest assistance: ${document.guestLocation}`,
    sourceType: "policy",
    excerpt: document.need,
    rationale: `${document.assignedRole ?? "Operations"} assigned for ${document.status} request.`,
    sourceId: document.id,
  };
}

function evidenceFromFacility(document: ElasticFacilityStatus): EvidenceResult {
  return {
    title: `${document.assetLabel} status`,
    sourceType: "runbook",
    excerpt: document.notes ?? `${document.assetLabel} is ${document.status}.`,
    rationale: `Last checked ${document.lastCheckedAt}.`,
    sourceId: document.id,
  };
}

function evidenceFromGateFlow(document: ElasticGateFlowLog): EvidenceResult {
  return {
    title: `${document.gateLabel} flow log`,
    sourceType: "radio_log",
    excerpt: document.observation,
    rationale: `Logged from ${document.source} at ${document.loggedAt}.`,
    sourceId: document.id,
  };
}

function evidenceFromRadio(document: ElasticRadioTranscript): EvidenceResult {
  return {
    title: document.label,
    sourceType: "radio_log",
    excerpt: document.excerpt,
    rationale: document.lines.slice(0, 2).join(" "),
    sourceId: document.id,
  };
}

function buildEvidenceForIncident(
  incident: ElasticActiveIncident,
  context: ElasticPullRelatedContext,
): EvidenceResult[] {
  const evidenceById = new Map(context.evidence.map((item) => [item.id, item]));
  const selected: EvidenceResult[] = [];

  for (const evidenceId of incident.evidenceIds ?? []) {
    const document = evidenceById.get(evidenceId);
    if (document) {
      selected.push(evidenceFromDocument(document));
    }
  }

  for (const guest of context.guestAssistance) {
    if (guest.relatedIncidentId === incident.id) {
      selected.push(evidenceFromGuestAssistance(guest));
    }
  }

  for (const facility of context.facilityStatus) {
    if (facility.relatedIncidentId === incident.id) {
      selected.push(evidenceFromFacility(facility));
    }
  }

  for (const gateLog of context.gateFlowLogs) {
    if (gateLog.relatedIncidentId === incident.id) {
      selected.push(evidenceFromGateFlow(gateLog));
    }
  }

  for (const policy of context.policies) {
    if (policy.appliesToCategories.includes(incident.category)) {
      selected.push(evidenceFromPolicy(policy));
    }
  }

  for (const transcript of context.radioTranscripts) {
    if (transcript.relatedIncidentIds?.includes(incident.id)) {
      selected.push(evidenceFromRadio(transcript));
    }
  }

  const deduped = new Map<string, EvidenceResult>();
  for (const item of selected) {
    if (!deduped.has(item.sourceId)) {
      deduped.set(item.sourceId, item);
    }
  }

  return [...deduped.values()].slice(0, 6);
}

export function activeIncidentToPackage(
  incident: ElasticActiveIncident,
  context: ElasticPullRelatedContext,
): IncidentPackage {
  const recommendedActions = recommendedActionsForTeam(incident.assignedRole);
  const guest = context.guestAssistance.find(
    (item) => item.relatedIncidentId === incident.id,
  );

  return {
    incident: {
      id: incident.id,
      rawText: incident.rawText,
      title: incident.title,
      incidentType: incident.incidentType,
      category: incident.category,
      locationId: incident.locationId,
      locationLabel: incident.locationLabel,
      priority: incident.priority,
      status: incident.status,
      assumptions: buildAssumptions(incident),
      evidenceIds: incident.evidenceIds ?? [],
      recommendedActions,
      approvedActionIds: [],
      assignedRole: incident.assignedRole,
    },
    evidence: buildEvidenceForIncident(incident, context),
    staffUpdate: guest?.need ?? incident.rawText,
  };
}

export function normalizeElasticActiveIncidents(
  incidents: ElasticActiveIncident[],
  context: ElasticPullRelatedContext,
  includeTimeline = true,
): IngestPullResponse {
  const sortedIncidents = [...incidents].sort((left, right) =>
    comparePriority(left, right),
  );
  const incidentPackages = sortIncidentPackages(
    sortedIncidents.map((incident) => activeIncidentToPackage(incident, context)),
  );
  const timeline = includeTimeline ? buildTimelineSeed(incidentPackages) : [];
  const reportSummary = buildPostEventReport(incidentPackages, timeline);
  const count = incidentPackages.length;

  return {
    sourceMode: "elastic",
    outcome: "success",
    ingestionSummary: `Elastic ingestion applied ${count} incident package${count === 1 ? "" : "s"}.`,
    incidentPackages,
    timeline,
    reportSummary,
    meta: {
      pulledAt: new Date().toISOString(),
      incidentCount: count,
      elasticQuery: "stadium_active_incidents/_search",
    },
  };
}
