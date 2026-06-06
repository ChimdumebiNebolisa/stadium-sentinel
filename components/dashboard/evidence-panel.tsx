import { getPrioritySummary } from "@/lib/priority";
import type { IncidentPackage } from "@/lib/types";

export function EvidencePanel({
  incidentPackage,
}: {
  incidentPackage: IncidentPackage;
}) {
  const { incident, evidence } = incidentPackage;

  return (
    <section className="h-full pr-2" data-testid="evidence-panel">
      <p className="ops-label">Why this is flagged</p>
      <p className="mt-1.5 text-sm leading-6 text-slate-300">
        {getPrioritySummary(incident)}
      </p>

      <div className="ops-flat-section">
        <p className="ops-label">Operational evidence</p>
        <div className="mt-2 divide-y divide-white/8">
          {evidence.map((item) => (
            <article
              key={item.sourceId}
              className="py-3"
            >
              <p className="ops-label">
                {item.sourceType.replaceAll("_", " ")}
              </p>
              <h3 className="mt-1 font-semibold text-white">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-300">
                {item.excerpt}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Why it matters: {item.rationale}
              </p>
            </article>
          ))}
        </div>
      </div>

      {incident.assumptions.length > 0 ? (
        <div className="ops-flat-section">
          <p className="ops-label">Reported context</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {incident.assumptions.join(" ")}
          </p>
        </div>
      ) : null}
    </section>
  );
}
