import { getPrioritySummary } from "@/lib/priority";
import type { IncidentPackage } from "@/lib/types";

export function EvidencePanel({
  incidentPackage,
}: {
  incidentPackage: IncidentPackage;
}) {
  const { incident, evidence } = incidentPackage;

  return (
    <section className="ops-subpanel p-5" data-testid="evidence-panel">
      <p className="ops-label">Why this is flagged</p>
      <p className="mt-2 max-w-[68ch] text-sm leading-6 text-slate-300">
        {getPrioritySummary(incident)}
      </p>

      <div className="mt-3">
        <p className="ops-label">Operational evidence</p>
        <div className="mt-3 space-y-3">
          {evidence.map((item) => (
            <article
              key={item.sourceId}
              className="border border-white/8 bg-[#101418] p-4"
            >
              <p className="ops-label">
                {item.sourceType.replaceAll("_", " ")}
              </p>
              <h3 className="mt-1 font-semibold text-white">{item.title}</h3>
              <p className="mt-1.5 max-w-[68ch] text-sm leading-6 text-slate-300">
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
        <div className="mt-4 border-t border-white/8 pt-4">
          <p className="ops-label">Reported context</p>
          <p className="mt-2 max-w-[68ch] text-xs leading-5 text-slate-500">
            {incident.assumptions.join(" ")}
          </p>
        </div>
      ) : null}
    </section>
  );
}
