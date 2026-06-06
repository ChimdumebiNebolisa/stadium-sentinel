import type {
  Incident,
  IncidentCategory,
  IncidentType,
  LocationRecord,
  PriorityLevel,
  TimelineEntryType,
} from "@/lib/types";

type PriorityInput = {
  incidentType: IncidentType;
  category: IncidentCategory;
  location: Pick<
    LocationRecord,
    | "type"
    | "zoneLayer"
    | "accessibilityCritical"
    | "crowdFlowCritical"
    | "restrictedAccess"
  >;
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
  if (
    input.location.restrictedAccess &&
    (input.incidentType === "queue-congestion" ||
      input.incidentType === "accessibility-assist")
  ) {
    return "Immediate";
  }

  if (
    input.incidentType === "accessibility-assist" ||
    input.category === "guest-assistance"
  ) {
    return "Immediate";
  }

  if (
    input.incidentType === "facility-outage" &&
    input.location.accessibilityCritical
  ) {
    return "High";
  }

  if (
    input.incidentType === "queue-congestion" &&
    input.location.zoneLayer === "perimeter"
  ) {
    return "High";
  }

  if (
    input.location.zoneLayer === "bowl" &&
    !input.location.accessibilityCritical &&
    !input.location.crowdFlowCritical &&
    !input.location.restrictedAccess
  ) {
    return "Monitor";
  }

  return "Moderate";
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
      return "Infrastructure outage at a critical movement point. Preserve access and reroute now.";
    case "accessibility-assist":
      return "Guest assistance is tied to a critical access point. Acknowledge and escort now.";
    case "queue-congestion":
      return "Crowd pressure is building in a circulation-critical zone. Contain it before it cascades.";
    default:
      return "Operational issue flagged for response.";
  }
}

export function getPrioritySummary(incident: Incident): string {
  switch (incident.incidentType) {
    case "facility-outage":
      return "Critical access is degraded. Dispatch Facilities and hold the reroute path.";
    case "accessibility-assist":
      return "Guest needs escorted support through a sensitive venue path. Guest Services should respond now.";
    case "queue-congestion":
      return "Crowd-flow risk is rising in the perimeter ingress lane. Open capacity and redirect guests.";
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
