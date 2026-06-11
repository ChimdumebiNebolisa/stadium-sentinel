import type { IncidentDetails, IncidentPackage } from "@/lib/types";

export function formatOperationalContextLines(
  incidentPackage: IncidentPackage,
): string[] {
  const lines: string[] = [];
  const details = incidentPackage.incident.details;

  if (incidentPackage.assignedStaff && incidentPackage.assignedStaff.length > 0) {
    lines.push("Assigned staff roster:");
    for (const staff of incidentPackage.assignedStaff) {
      lines.push(
        `- ${staff.callSign} (${staff.team})${staff.zone ? ` · zone ${staff.zone}` : ""}`,
      );
    }
  }

  if (!details) {
    return lines;
  }

  for (const record of details.sourceRecords ?? []) {
    lines.push(
      `- ${record.sourceSystemLabel} ${record.sourceRecordId}: ${record.locationDescription}`,
    );
  }

  for (const note of details.commandCenterNotes ?? []) {
    lines.push(
      `- Command center note (${note.noteType}) at ${note.at}: ${note.text}`,
    );
  }

  for (const update of details.operationsUpdates ?? []) {
    const responder = update.responderLabel ? ` ${update.responderLabel}` : "";
    const eta = update.eta ? ` · ETA ${update.eta}` : "";
    const blocker = update.blocker ? ` · blocker: ${update.blocker}` : "";
    lines.push(
      `- Operations update${responder}: ${update.currentStatus}${eta}${blocker}`,
    );
  }

  for (const report of details.staffFieldReports ?? []) {
    lines.push(
      `- Staff field report (${report.reportChannel}) at ${report.location}: ${report.observedIssue}`,
    );
  }

  for (const media of details.mediaMetadata ?? []) {
    lines.push(
      `- Media ${media.mediaId} (${media.mediaType}): ${media.available ? "available" : "unavailable"} — ${media.description}`,
    );
  }

  if (details.dispatchHandoff) {
    const handoff = details.dispatchHandoff;
    lines.push(
      `- Dispatch handoff: ${handoff.currentTeam}${handoff.handoffTo ? ` → ${handoff.handoffTo}` : ""}${handoff.handoffNote ? ` — ${handoff.handoffNote}` : ""}`,
    );
  }

  if (details.similarPriorIncidentRef) {
    const prior = details.similarPriorIncidentRef;
    lines.push(
      `- Similar prior incident ${prior.incidentId}: ${prior.title} — ${prior.resolutionNote}`,
    );
  }

  return lines;
}

export function operationalCitationHints(details?: IncidentDetails): string[] {
  if (!details) {
    return [];
  }

  const hints: string[] = [];

  for (const record of details.sourceRecords ?? []) {
    hints.push(record.sourceRecordId);
  }

  for (const staff of details.operationsUpdates ?? []) {
    if (staff.responderLabel) {
      hints.push(staff.responderLabel);
    }
  }

  for (const media of details.mediaMetadata ?? []) {
    hints.push(media.mediaId);
  }

  return hints;
}
