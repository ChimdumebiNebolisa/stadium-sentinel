import { comparePriority } from "@/lib/priority";
import type { Incident, IncidentPackage, TimelineEntry } from "@/lib/types";

export type IncidentCompletionInput = {
  incident: Incident;
  timeline?: TimelineEntry[];
};

export type IncidentCompletionLabel = "Completed" | "Logged" | "Resolved";

const EXPLICIT_RESOLVED_PATTERN = /^(resolved|completed)$/i;
const EXPLICIT_LOGGED_PATTERN = /^logged$/i;

function actionId(incidentId: string, actionIndex: number): string {
  return `${incidentId}-action-${actionIndex}`;
}

export function areAllRecommendedActionsComplete(incident: Incident): boolean {
  if (incident.recommendedActions.length === 0) {
    return false;
  }

  return incident.recommendedActions.every((_, index) =>
    incident.approvedActionIds.includes(actionId(incident.id, index)),
  );
}

function statusHistoryIndicates(
  input: IncidentCompletionInput,
  pattern: RegExp,
): boolean {
  for (const record of input.incident.details?.sourceRecords ?? []) {
    for (const entry of record.statusHistory) {
      if (pattern.test(entry.status.trim())) {
        return true;
      }
    }
  }

  return false;
}

function incidentLogIndicates(
  input: IncidentCompletionInput,
  pattern: RegExp,
): boolean {
  for (const event of input.incident.details?.incidentLog ?? []) {
    if (pattern.test(event.eventType.trim())) {
      return true;
    }
  }

  return false;
}

function timelineIndicatesResolved(input: IncidentCompletionInput): boolean {
  if (!input.timeline) {
    return false;
  }

  return input.timeline.some(
    (entry) =>
      entry.incidentId === input.incident.id &&
      /\b(resolved|response steps complete)\b/i.test(entry.message),
  );
}

export function hasExplicitResolvedStatus(input: IncidentCompletionInput): boolean {
  return (
    statusHistoryIndicates(input, EXPLICIT_RESOLVED_PATTERN) ||
    incidentLogIndicates(input, EXPLICIT_RESOLVED_PATTERN) ||
    timelineIndicatesResolved(input)
  );
}

export function hasExplicitLoggedStatus(input: IncidentCompletionInput): boolean {
  return (
    statusHistoryIndicates(input, EXPLICIT_LOGGED_PATTERN) ||
    incidentLogIndicates(input, EXPLICIT_LOGGED_PATTERN)
  );
}

export function hasExplicitCompletedStatus(input: IncidentCompletionInput): boolean {
  return hasExplicitResolvedStatus(input) || hasExplicitLoggedStatus(input);
}

export function isIncidentCompleted(input: IncidentCompletionInput): boolean {
  return (
    hasExplicitCompletedStatus(input) || areAllRecommendedActionsComplete(input.incident)
  );
}

export function getIncidentCompletionLabel(
  input: IncidentCompletionInput,
): IncidentCompletionLabel | null {
  if (!isIncidentCompleted(input)) {
    return null;
  }

  if (hasExplicitResolvedStatus(input)) {
    return "Resolved";
  }

  if (hasExplicitLoggedStatus(input)) {
    return "Logged";
  }

  return "Completed";
}

export function compareIncidentQueueOrder(
  left: IncidentPackage,
  right: IncidentPackage,
  timeline?: TimelineEntry[],
): number {
  const leftCompleted = isIncidentCompleted({
    incident: left.incident,
    timeline,
  });
  const rightCompleted = isIncidentCompleted({
    incident: right.incident,
    timeline,
  });

  if (leftCompleted !== rightCompleted) {
    return leftCompleted ? 1 : -1;
  }

  return comparePriority(left.incident, right.incident);
}
