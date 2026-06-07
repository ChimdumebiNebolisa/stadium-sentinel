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
      return "Dispatch runbook";
    case "location":
      return "Facility status";
    case "staff_rule":
      return "Staff roster";
    case "historical_incident":
      return "Guest report";
    default:
      return String(sourceType).replace(/_/g, " ");
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

      <div className="mt-3 border-t border-slate-200 pt-3">
        <p className="ops-label">Evidence used</p>
        <div className="mt-1.5 divide-y divide-slate-200">
          {visibleEvidence.map((item) => (
            <article key={normalizeEvidenceKey(item)} className="py-2">
              <p className="ops-label">{formatEvidenceSourceType(item.sourceType)}</p>
              <h3 className="mt-1 font-semibold text-[#07111c]">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{item.excerpt}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Why it matters: {item.rationale}
              </p>
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
