"use client";

import { useEffect, useState, type ReactNode } from "react";

import { RadioTranscriptPanel } from "@/components/dashboard/radio-transcript-panel";
import {
  isRealDemoFlowEnabled,
  readRadioTranscriptPanelEnabled,
} from "@/lib/feature-flags";
import { readSourcesConnected } from "@/lib/intake-demo";
import type { RadioTranscriptRecord } from "@/lib/radio-transcript-intake";

type IntakeContextBarProps = {
  onPullReports: () => void;
  pullStatus: string | null;
  batchCount: number | null;
  operationsConnected?: boolean;
  onConnectOperations?: () => void;
  connectStatus?: string | null;
  connectLoading?: boolean;
  pullLoading?: boolean;
  sourceSummary?: string | null;
  sentinelControl?: ReactNode;
  onExtractTranscript?: (text: string, presetId?: string) => void;
  transcriptExtractStatus?: string | null;
  latestTranscriptRecord?: RadioTranscriptRecord | null;
};

export function IntakeContextBar({
  onPullReports,
  pullStatus,
  batchCount,
  operationsConnected = false,
  onConnectOperations,
  connectStatus,
  connectLoading = false,
  pullLoading = false,
  sourceSummary,
  sentinelControl,
  onExtractTranscript,
  transcriptExtractStatus,
  latestTranscriptRecord,
}: IntakeContextBarProps) {
  const [mounted, setMounted] = useState(false);
  const [sourcesConnected, setSourcesConnected] = useState(false);
  const [showRadioPanel, setShowRadioPanel] = useState(false);
  const realDemoFlow = isRealDemoFlowEnabled();
  const pullEnabled = mounted && (realDemoFlow ? operationsConnected : sourcesConnected);

  useEffect(() => {
    setMounted(true);
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
            {realDemoFlow ? "Stadium operations data" : "Operations intake"}
          </p>
          {sourceSummary ? (
            <p className="mt-1 text-sm text-slate-600" data-testid="command-strip-summary">
              {sourceSummary}
            </p>
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
              {connectLoading ? "Connecting..." : "Connect operations data"}
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
          {sentinelControl}
          {mounted && realDemoFlow && !operationsConnected ? (
            <p className="text-xs text-slate-500" data-testid="pull-helper-text">
              Connect operations data first.
            </p>
          ) : null}
          {mounted && realDemoFlow && operationsConnected && batchCount === 0 && !pullStatus ? (
            <p className="text-xs text-slate-500" data-testid="pull-ready-helper-text">
              Pull latest reports to load incidents.
            </p>
          ) : null}
          {mounted && !realDemoFlow && !sourcesConnected ? (
            <p className="text-xs text-slate-500" data-testid="pull-helper-text">
              Connect operations data first.
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
        </div>
      </div>

      {mounted && showRadioPanel && onExtractTranscript ? (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <RadioTranscriptPanel
            onExtract={onExtractTranscript}
            extractStatus={transcriptExtractStatus ?? null}
            latestRecord={latestTranscriptRecord ?? null}
          />
        </div>
      ) : null}
    </section>
  );
}
