import type {
  Incident,
  IncidentCategory,
  IncidentType,
  PriorityLevel,
  TimelineEntryType,
} from "@/lib/types";

type PriorityInput = {
  incidentType: IncidentType;
  category: IncidentCategory;
  locationType: string;
};

export const PRIORITY_ORDER = [
  "Immediate",
  "High",
  "Moderate",
  "Monitor",
] as const;

const INCIDENT_TYPE_ORDER = [
  "accessibility-assist",
  "facility-outage",
  "queue-congestion",
] as const;

function getOrderIndex<T extends string>(
  order: readonly T[],
  value: string,
): number {
  const index = order.indexOf(value as T);

  return index === -1 ? order.length : index;
}

export function derivePriority(input: PriorityInput): PriorityLevel {
  switch (input.incidentType) {
    case "accessibility-assist":
      return "Immediate";
    case "facility-outage":
      return input.locationType === "elevator" ? "High" : "Moderate";
    case "queue-congestion":
      return "High";
    default:
      switch (input.category) {
        case "guest-assistance":
          return "Immediate";
        case "crowd-flow":
          return "High";
        case "facility-outage":
          return "Moderate";
        default:
          return "Monitor";
      }
  }
}

export function comparePriority(
  left: Pick<Incident, "priority" | "incidentType">,
  right: Pick<Incident, "priority" | "incidentType">,
): number {
  const priorityDelta =
    getOrderIndex(PRIORITY_ORDER, left.priority) -
    getOrderIndex(PRIORITY_ORDER, right.priority);

  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return (
    getOrderIndex(INCIDENT_TYPE_ORDER, left.incidentType) -
    getOrderIndex(INCIDENT_TYPE_ORDER, right.incidentType)
  );
}

export function getPriorityLevel(incident: Incident): PriorityLevel {
  return incident.priority;
}

// Plain-language reason for the priority, no derived ranking output.
export function getPriorityRationale(incident: Incident): string {
  switch (incident.incidentType) {
    case "facility-outage":
      return "Infrastructure outage blocking the accessible route. Dispatch now.";
    case "accessibility-assist":
      return "Guest needs accessible support. Acknowledge and escort.";
    case "queue-congestion":
      return "Ingress backup risks crowd-flow safety. Respond before it spreads.";
    default:
      return "Operational issue flagged for response.";
  }
}

export function getPrioritySummary(incident: Incident): string {
  switch (incident.incidentType) {
    case "facility-outage":
      return "Accessible route blocked. Dispatch Facilities now.";
    case "accessibility-assist":
      return "Guest needs escorted support. Guest Services should respond now.";
    case "queue-congestion":
      return "Crowd-flow risk building at entry. Open the lane and redirect guests.";
    default:
      return "Operational issue requires response.";
  }
}

export function getAssignmentStatus(incident: Incident): string {
  if (incident.status === "actioned") {
    return `${incident.assignedRole} assigned. Approved and in motion.`;
  }

  if (incident.status === "ready") {
    return `${incident.assignedRole} assigned. Awaiting approval.`;
  }

  return `${incident.assignedRole} assigned.`;
}

export function getTimelineTypeLabel(type: TimelineEntryType): string {
  switch (type) {
    case "reported":
      return "Intake";
    case "suggested":
      return "Recommendation";
    case "approved":
      return "Approved";
    default:
      return type;
  }
}

export function getReportPriorityLabel(incident: Incident): string {
  return incident.priority;
}
