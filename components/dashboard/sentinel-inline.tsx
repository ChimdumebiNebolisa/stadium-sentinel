"use client";

import { useEffect, useState } from "react";

import { buildSentinelExplanation } from "@/components/dashboard/sentinel-explanation";
import type { IncidentPackage } from "@/lib/types";

type SentinelInlineProps = {
  incidentPackage: IncidentPackage;
};

export function SentinelInline({ incidentPackage }: SentinelInlineProps) {
  const [open, setOpen] = useState(false);
  const incidentId = incidentPackage.incident.id;
  const explanation = buildSentinelExplanation(incidentPackage);

  useEffect(() => {
    setOpen(false);
  }, [incidentId]);

  return (
    <div className="mt-3">
      <button
        type="button"
        data-testid="sentinel-control"
        aria-expanded={open}
        aria-controls={`sentinel-panel-${incidentId}`}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.05em] text-violet-900 transition-colors hover:bg-violet-500/12"
      >
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[0.65rem] font-bold text-white"
          aria-hidden="true"
        >
          S
        </span>
        Ask Sentinel
      </button>

      {open ? (
        <div
          id={`sentinel-panel-${incidentId}`}
          data-testid="sentinel-panel"
          className="mt-4 rounded-md border border-violet-500/20 bg-violet-500/5 p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-violet-800">
            Sentinel explanation
          </p>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="font-medium text-slate-700">Why this priority</dt>
              <dd className="mt-0.5 text-slate-600">{explanation.whyPriority}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">Why this team</dt>
              <dd className="mt-0.5 text-slate-600">{explanation.whyTeam}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">What evidence supports it</dt>
              <dd className="mt-0.5 text-slate-600">{explanation.whyEvidence}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">Next recommended action</dt>
              <dd className="mt-0.5 text-slate-600">{explanation.nextAction}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}
