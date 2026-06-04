import { getPrioritySummary } from "@/lib/priority";
import type { EvidenceResult, Incident, IncidentPackage, PriorityLevel } from "@/lib/types";

const ACTION_TEMPLATES: Record<
  Incident["incidentType"],
  { assignedRole: string; recommendedActions: string[] }
> = {
  "queue-congestion": {
    assignedRole: "Crowd Flow Lead",
    recommendedActions: [
      "Dispatch Crowd Flow Lead to Gate B.",
      "Open the overflow queue path and rebalance screening lanes.",
      "Post a five-minute ingress advisory to gate supervisors.",
    ],
  },
  "facility-outage": {
    assignedRole: "Facilities Engineer",
    recommendedActions: [
      "Send Facilities to Elevator 4 for diagnosis.",
      "Assign accessibility support to the alternate route.",
      "Update operations with restoration ETA or outage confirmation.",
    ],
  },
  "accessibility-assist": {
    assignedRole: "Guest Services Supervisor",
    recommendedActions: [
      "Dispatch Guest Services to Section 112 with wheelchair support.",
      "Coordinate the nearest accessible route from the guest's current position.",
      "Confirm arrival and guest handoff over radio.",
    ],
  },
};

export function buildDeterministicPackage(
  incident: Incident,
  evidence: EvidenceResult[],
): IncidentPackage {
  const template = ACTION_TEMPLATES[incident.incidentType];
  const recommendedActions = [...template.recommendedActions];

  return {
    incident: {
      ...incident,
      evidenceIds: evidence.map((item) => item.sourceId),
      recommendedActions,
      assignedRole: template.assignedRole,
    },
    evidence,
    staffUpdate: buildStaffUpdate({
      incident,
      assignedRole: template.assignedRole,
      firstAction: recommendedActions[0],
    }),
  };
}

type StaffUpdateInput = {
  incident: Incident;
  assignedRole: string;
  firstAction: string;
};

type GeminiRefinementInput = {
  incidentTitle: string;
  locationLabel: string;
  priority: PriorityLevel;
  assignedRole: string;
  recommendedActions: string[];
  evidence: EvidenceResult[];
};

export function buildStaffUpdate(input: StaffUpdateInput): string {
  const priority =
    input.incident.priority === "Monitor"
      ? "Monitor"
      : `${input.incident.priority} priority`;
  const summary = getPrioritySummary(input.incident);

  return `Ops update: ${input.incident.title} is ${priority}. ${summary} ${input.assignedRole} is assigned. Next action: ${input.firstAction}`;
}

export function buildGeminiActionPrompt(input: GeminiRefinementInput): string {
  const evidenceLines = input.evidence.map(
    (item) =>
      `- ${item.sourceType}: ${item.title}. ${item.excerpt} Why it matters: ${item.rationale}`,
  );

  return [
    "You are refining operations wording for Stadium Sentinel.",
    "Return strict JSON with keys recommendedActions and staffUpdate.",
    "Keep the existing incident count and categorical priority labels.",
    "Do not mention scores, severity scores, confidence percentages, or numeric urgency.",
    `Incident: ${input.incidentTitle}`,
    `Location: ${input.locationLabel}`,
    `Priority: ${input.priority}`,
    `Assigned role: ${input.assignedRole}`,
    "Current recommended actions:",
    ...input.recommendedActions.map((action) => `- ${action}`),
    "Grounding evidence:",
    ...evidenceLines,
  ].join("\n");
}
