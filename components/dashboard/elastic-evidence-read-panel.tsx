"use client";

import { useEffect, useState } from "react";

import type { EvidenceResult, IncidentPackage } from "@/lib/types";

type ElasticEvidenceReadPanelProps = {
  incidentPackage: IncidentPackage;
};

type EvidenceReadPayload = {
  evidence: EvidenceResult[];
  retrievalMode: "elastic" | "local";
  elasticConfigured: boolean;
  fallbackMessage: string | null;
};

export function ElasticEvidenceReadPanel({
  incidentPackage,
}: ElasticEvidenceReadPanelProps) {
  const [payload, setPayload] = useState<EvidenceReadPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const { incident } = incidentPackage;

    setLoading(true);
    fetch("/api/evidence/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        incidentTitle: incident.title,
        incidentCategory: incident.category,
        locationName: incident.locationLabel,
        priority: incident.priority,
        reportText: incident.rawText,
      }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (!cancelled && result) {
          setPayload(result as EvidenceReadPayload);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPayload({
            evidence: incidentPackage.evidence,
            retrievalMode: "local",
            elasticConfigured: false,
            fallbackMessage: "On-file evidence is shown below for review.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [incidentPackage]);

  const modeLabel =
    payload?.retrievalMode === "elastic"
      ? "Elastic context"
      : payload?.elasticConfigured
        ? "Command context"
        : "On-file context";

  return (
    <details
      className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
      data-testid="elastic-evidence-read-panel"
    >
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.03em] text-slate-700">
        Source trace
      </summary>
      <div className="mt-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">Evidence support trace</p>
          <span
            className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[0.7rem] font-medium text-slate-700"
            data-testid="evidence-read-mode"
          >
            {loading ? "Checking..." : modeLabel}
          </span>
        </div>
        {payload?.fallbackMessage ? (
          <p className="mt-2 text-xs leading-5 text-slate-500">{payload.fallbackMessage}</p>
        ) : null}
        {!loading && payload && payload.evidence.length > 0 ? (
          <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
            {payload.evidence.slice(0, 2).map((item) => (
              <li key={item.sourceId}>
                <span className="font-medium text-slate-800">{item.title}</span>: {item.excerpt}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}
