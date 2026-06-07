"use client";

import { useEffect, useState } from "react";

import { readIntakeComplete, readSourcesConnected } from "@/lib/intake-demo";

type IntakeContextBarProps = {
  onPullReports: () => void;
  pullStatus: string | null;
  batchCount: number | null;
  topIncidentTitle: string | null;
};

export function IntakeContextBar({
  onPullReports,
  pullStatus,
  batchCount,
  topIncidentTitle,
}: IntakeContextBarProps) {
  const [mounted, setMounted] = useState(false);
  const [intakeComplete, setIntakeComplete] = useState(false);
  const [sourcesConnected, setSourcesConnected] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIntakeComplete(readIntakeComplete());
    setSourcesConnected(readSourcesConnected());
  }, []);

  return (
    <section
      className="ops-panel ops-strip intake-context-bar"
      data-testid="intake-context-bar"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-600">
            Sources synced: Guest Services · Security · Facilities · Radio Log
          </p>
          {mounted && intakeComplete ? (
            <div className="mt-2 space-y-1 text-sm text-slate-500">
              <p data-testid="intake-last-sync">Last sync: Demo intake completed</p>
              <p data-testid="intake-summary">
                {batchCount !== null
                  ? `${batchCount} incident${batchCount !== 1 ? "s" : ""} loaded. Highest priority: ${topIncidentTitle ?? "—"}.`
                  : "Demo intake completed."}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="pull-latest-reports"
            disabled={!mounted || !sourcesConnected}
            onClick={onPullReports}
            className="rounded-md border border-blue-500/40 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Pull latest reports
          </button>
          {mounted && !sourcesConnected ? (
            <p className="text-sm text-slate-500" data-testid="pull-helper-text">
              Connect demo sources first.
            </p>
          ) : null}
          {pullStatus ? (
            <p className="text-sm text-slate-500" data-testid="pull-status">
              {pullStatus}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
