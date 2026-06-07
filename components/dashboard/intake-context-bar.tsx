"use client";

import { useEffect, useState } from "react";

import { IngestionStatusBanner } from "@/components/dashboard/ingestion-status-banner";
import { RadioTranscriptPanel } from "@/components/dashboard/radio-transcript-panel";
import type { ChangeSummary } from "@/lib/demo-agent-workflow";
import { readIntakeComplete, readSourcesConnected } from "@/lib/intake-demo";
import type { RadioTranscriptRecord } from "@/lib/radio-transcript-intake";

type IntakeContextBarProps = {
  onPullReports: () => void;
  pullStatus: string | null;
  batchCount: number | null;
  topIncidentTitle: string | null;
  changeSummary: ChangeSummary | null;
  onExtractTranscript: (text: string, presetId?: string) => void;
  transcriptExtractStatus: string | null;
  latestTranscriptRecord: RadioTranscriptRecord | null;
  ingestionFallbackMessage?: string | null;
};

export function IntakeContextBar({
  onPullReports,
  pullStatus,
  batchCount,
  topIncidentTitle,
  changeSummary,
  onExtractTranscript,
  transcriptExtractStatus,
  latestTranscriptRecord,
  ingestionFallbackMessage,
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.04em] text-slate-500">
            Demo sources · Guest Services · Security · Facilities · Radio Log
          </p>
          {mounted && intakeComplete ? (
            <div className="mt-1 space-y-0.5 text-xs text-slate-500">
              <p data-testid="intake-last-sync">Last sync: Demo intake completed</p>
              <p data-testid="intake-summary">
                {batchCount !== null
                  ? `${batchCount} incident${batchCount !== 1 ? "s" : ""} loaded · Top: ${topIncidentTitle ?? "—"}`
                  : "Demo intake completed."}
              </p>
            </div>
          ) : null}
          {changeSummary ? (
            <div
              className="mt-2 rounded-md border border-sky-500/20 bg-sky-500/5 px-2.5 py-1.5"
              data-testid="what-changed-summary"
            >
              <p className="text-xs font-semibold text-[#07111c]">What changed?</p>
              <ul className="mt-0.5 space-y-0.5 text-xs text-slate-600">
                {changeSummary.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="pull-latest-reports"
            disabled={!mounted || !sourcesConnected}
            onClick={onPullReports}
            className="rounded-md border border-blue-500/40 bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Pull latest reports
          </button>
          {mounted && !sourcesConnected ? (
            <p className="text-xs text-slate-500" data-testid="pull-helper-text">
              Connect demo sources first.
            </p>
          ) : null}
          {pullStatus ? (
            <p className="text-xs text-slate-500" data-testid="pull-status">
              {pullStatus}
            </p>
          ) : null}
        </div>
      </div>

      <IngestionStatusBanner fallbackMessage={ingestionFallbackMessage} />

      <RadioTranscriptPanel
        onExtract={onExtractTranscript}
        extractStatus={transcriptExtractStatus}
        latestRecord={latestTranscriptRecord}
      />
    </section>
  );
}
