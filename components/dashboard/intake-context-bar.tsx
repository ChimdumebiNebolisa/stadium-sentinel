"use client";

import { useEffect, useState } from "react";

import { IngestionStatusBanner } from "@/components/dashboard/ingestion-status-banner";
import { RadioTranscriptPanel } from "@/components/dashboard/radio-transcript-panel";
import type { ChangeSummary } from "@/lib/demo-agent-workflow";
import { isRealDemoFlowEnabled, readRadioTranscriptPanelEnabled } from "@/lib/feature-flags";
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
  automaticIngestEnabled?: boolean;
  automaticIngestReason?: string;
  onAutomaticIngest?: () => void;
  automaticIngestStatus?: string | null;
  operationsConnected?: boolean;
  onConnectOperations?: () => void;
  connectStatus?: string | null;
  connectLoading?: boolean;
  pullLoading?: boolean;
  ingestionRefreshKey?: number;
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
  automaticIngestEnabled = false,
  automaticIngestReason,
  onAutomaticIngest,
  automaticIngestStatus,
  operationsConnected = false,
  onConnectOperations,
  connectStatus,
  connectLoading = false,
  pullLoading = false,
  ingestionRefreshKey = 0,
}: IntakeContextBarProps) {
  const [mounted, setMounted] = useState(false);
  const [intakeComplete, setIntakeComplete] = useState(false);
  const [sourcesConnected, setSourcesConnected] = useState(false);
  const [showRadioPanel, setShowRadioPanel] = useState(false);
  const realDemoFlow = isRealDemoFlowEnabled();
  const pullEnabled = mounted && (realDemoFlow ? operationsConnected : sourcesConnected);

  useEffect(() => {
    setMounted(true);
    setIntakeComplete(readIntakeComplete());
    setSourcesConnected(readSourcesConnected());
    setShowRadioPanel(readRadioTranscriptPanelEnabled());
  }, []);

  return (
    <section
      className="ops-panel ops-strip intake-context-bar"
      data-testid="intake-context-bar"
      data-ready={mounted ? "true" : "false"}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.04em] text-slate-500">
            {realDemoFlow
              ? "Stadium operations data · Elastic-backed incidents"
              : "Demo sources · Guest Services · Security · Facilities · Radio Log"}
          </p>
          {mounted && realDemoFlow && operationsConnected ? (
            <p className="mt-1 text-xs text-emerald-800" data-testid="operations-connected-status">
              Elastic operations data connected.
            </p>
          ) : null}
          {mounted && !realDemoFlow && intakeComplete ? (
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
          {mounted && realDemoFlow && !operationsConnected ? (
            <button
              type="button"
              data-testid="connect-operations-data"
              disabled={connectLoading}
              onClick={onConnectOperations}
              className="rounded-md border border-emerald-500/40 bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {connectLoading ? "Connecting…" : "Connect operations data"}
            </button>
          ) : null}
          {mounted && (!realDemoFlow || operationsConnected) ? (
            <button
              type="button"
              data-testid="pull-latest-reports"
              disabled={!pullEnabled || pullLoading}
              onClick={onPullReports}
              className="rounded-md border border-blue-500/40 bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {pullLoading ? "Pulling reports..." : "Pull latest reports"}
            </button>
          ) : null}
          {mounted && realDemoFlow && !operationsConnected ? (
            <p className="text-xs text-slate-500" data-testid="pull-helper-text">
              Connect operations data first.
            </p>
          ) : null}
          {mounted && realDemoFlow && operationsConnected && batchCount === 0 ? (
            <p className="text-xs text-slate-500" data-testid="pull-ready-helper-text">
              Pull latest reports to load incidents.
            </p>
          ) : null}
          {mounted && !realDemoFlow && !sourcesConnected ? (
            <p className="text-xs text-slate-500" data-testid="pull-helper-text">
              Connect demo sources first.
            </p>
          ) : null}
          {connectStatus ? (
            <p className="text-xs text-slate-500" data-testid="connect-status">
              {connectStatus}
            </p>
          ) : null}
          {pullStatus ? (
            <p className="text-xs text-slate-500" data-testid="pull-status">
              {pullStatus}
            </p>
          ) : null}
          <button
            type="button"
            data-testid="automatic-ingest-prototype"
            disabled={!mounted || !automaticIngestEnabled}
            title={automaticIngestReason}
            onClick={onAutomaticIngest}
            className="rounded-md border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-sm font-medium text-violet-900 transition-colors hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Automatic ingest (prototype)
          </button>
          {automaticIngestStatus ? (
            <p className="text-xs text-slate-500" data-testid="automatic-ingest-status">
              {automaticIngestStatus}
            </p>
          ) : null}
        </div>
      </div>

      <IngestionStatusBanner
        fallbackMessage={ingestionFallbackMessage}
        refreshKey={ingestionRefreshKey}
      />

      {mounted && showRadioPanel ? (
        <RadioTranscriptPanel
          onExtract={onExtractTranscript}
          extractStatus={transcriptExtractStatus}
          latestRecord={latestTranscriptRecord}
        />
      ) : null}
    </section>
  );
}
