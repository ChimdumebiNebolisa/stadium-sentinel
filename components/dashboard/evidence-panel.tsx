import { getPrioritySummary } from "@/lib/priority";
import type { EvidenceSourceType, IncidentPackage } from "@/lib/types";

function formatEvidenceSourceType(sourceType: EvidenceSourceType): string {
  if (sourceType === "radio_log") {
    return "Radio log";
  }

  return sourceType.replaceAll("_", " ");
}

export function EvidencePanel({
  incidentPackage,
}: {
  incidentPackage: IncidentPackage;
}) {
  const { incident, evidence } = incidentPackage;

  return (
    <section className="h-full pr-2" data-testid="evidence-panel">
      <p className="ops-label">Why this is flagged</p>
      <p className="mt-1.5 text-sm leading-6 text-slate-600">
        {getPrioritySummary(incident)}
      </p>

      <div className="mt-3 border-t border-slate-200 pt-3">
        <p className="ops-label">Operational evidence</p>
        <div className="mt-1.5 divide-y divide-slate-200">
          {evidence.map((item) => (
            <article
              key={item.sourceId}
              className="py-2"
            >
              <p className="ops-label">
                {formatEvidenceSourceType(item.sourceType)}
              </p>
              <h3 className="mt-1 font-semibold text-[#07111c]">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">
                {item.excerpt}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Why it matters: {item.rationale}
              </p>
            </article>
          ))}
        </div>
      </div>

      {incident.assumptions.length > 0 ? (
        <div className="mt-5 border-t border-slate-200 pt-4">
          <p className="ops-label">Reported context</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {incident.assumptions.join(" ")}
          </p>
        </div>
      ) : null}
    </section>
  );
}
