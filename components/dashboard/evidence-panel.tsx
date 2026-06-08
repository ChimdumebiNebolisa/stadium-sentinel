import { ElasticEvidenceReadPanel } from "@/components/dashboard/elastic-evidence-read-panel";
import { getPrioritySummary } from "@/lib/priority";
import type { EvidenceResult, EvidenceSourceType, IncidentPackage } from "@/lib/types";

function formatEvidenceSourceType(sourceType: EvidenceSourceType): string {
  switch (sourceType) {
    case "radio_log":
      return "Radio log";
    case "policy":
      return "Policy";
    case "runbook":
      return "Runbook";
    case "location":
      return "Facility status";
    case "staff_rule":
      return "Staff coverage";
    case "historical_incident":
      return "Past incident";
    default:
      return String(sourceType).replace(/_/g, " ");
  }
}

function getOperationalMeaning(item: EvidenceResult, incident: IncidentPackage["incident"]): string {
  switch (item.sourceType) {
    case "radio_log":
      return `Confirms the report is active in the live radio stream for ${incident.locationLabel}.`;
    case "policy":
      return `Maps this incident to the current operating policy for ${incident.assignedRole}.`;
    case "runbook":
      return `Shows the runbook path the responding team should follow at ${incident.locationLabel}.`;
    case "location":
      return `Links the venue layout and access point details back to the selected incident.`;
    case "staff_rule":
      return `Explains which team coverage rule applies to the selected queue item.`;
    case "historical_incident":
      return `Points to a prior incident with the same operational pattern at the venue.`;
    default:
      return item.rationale;
  }
}

function getActionImplication(item: EvidenceResult, incident: IncidentPackage["incident"]): string {
  switch (item.sourceType) {
    case "radio_log":
      return `Keep the assigned team aligned with the latest radio update for ${incident.title}.`;
    case "policy":
      return `Use the policy step to confirm the response sequence before write-back.`;
    case "runbook":
      return `Follow the runbook step already matched to the selected incident.`;
    case "location":
      return `Hold the route and position the response team at ${incident.locationLabel}.`;
    case "staff_rule":
      return `Keep ${incident.assignedRole} on task and avoid rerouting the assignment.`;
    case "historical_incident":
      return `Use the prior incident pattern to avoid a slower response path.`;
    default:
      return `Use this evidence to guide the selected incident response.`;
  }
}

function normalizeEvidenceKey(item: EvidenceResult): string {
  return [
    item.sourceType,
    item.title.trim().toLowerCase(),
    item.excerpt.trim().toLowerCase(),
  ].join("|");
}

function dedupeEvidence(evidence: EvidenceResult[]): EvidenceResult[] {
  const seen = new Set<string>();
  const next: EvidenceResult[] = [];

  for (const item of evidence) {
    const key = normalizeEvidenceKey(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(item);
    if (next.length === 5) {
      break;
    }
  }

  return next;
}

export function EvidencePanel({
  incidentPackage,
}: {
  incidentPackage: IncidentPackage;
}) {
  const { incident, evidence } = incidentPackage;
  const visibleEvidence = dedupeEvidence(evidence);
  const recommendedAction = incident.recommendedActions[0] ?? "Review the current queue.";

  return (
    <section className="h-full pr-2" data-testid="evidence-panel">
      <p className="ops-label">Why this is flagged</p>
      <p className="mt-1.5 text-sm leading-6 text-slate-600">{getPrioritySummary(incident)}</p>
      <p className="mt-2 text-xs text-slate-500">
        Selected incident context: {incident.title} · {incident.locationLabel} · {incident.assignedRole}
      </p>

      <div className="mt-3 border-t border-slate-200 pt-3">
        <p className="ops-label">Evidence used</p>
        <div className="mt-1.5 space-y-2">
          {visibleEvidence.map((item) => (
            <article
              key={normalizeEvidenceKey(item)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="ops-label">{formatEvidenceSourceType(item.sourceType)}</p>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[0.7rem] font-medium text-slate-600">
                  {incident.locationLabel}
                </span>
              </div>
              <h3 className="mt-1.5 font-semibold text-[#07111c]">{item.title}</h3>
              <div className="mt-2 grid gap-1.5 text-sm leading-6 text-slate-600">
                <p>
                  <span className="font-medium text-slate-700">Observed signal:</span>{" "}
                  {item.excerpt}
                </p>
                <p>
                  <span className="font-medium text-slate-700">Operational meaning:</span>{" "}
                  {getOperationalMeaning(item, incident)}
                </p>
                <p>
                  <span className="font-medium text-slate-700">Action implication:</span>{" "}
                  {getActionImplication(item, incident)}
                </p>
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">Current incident:</span>{" "}
                  {incident.title} · {incident.locationLabel} · {incident.assignedRole}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <p className="ops-label">Recommended next action</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{recommendedAction}</p>
      </div>

      {incident.assumptions.length > 0 ? (
        <div className="mt-5 border-t border-slate-200 pt-4">
          <p className="ops-label">Reported context</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {incident.assumptions.join(" ")}
          </p>
        </div>
      ) : null}

      <ElasticEvidenceReadPanel incidentPackage={incidentPackage} />
    </section>
  );
}
