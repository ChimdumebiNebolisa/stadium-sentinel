"use client";

import { useEffect, useState, type ReactNode } from "react";

import { RadioTranscriptPanel } from "@/components/dashboard/radio-transcript-panel";
import {
  isRealDemoFlowEnabled,
  readRadioTranscriptPanelEnabled,
} from "@/lib/feature-flags";
import { readSourcesConnected } from "@/lib/intake-demo";
import type { RadioTranscriptRecord } from "@/lib/radio-transcript-intake";

type CommandBarProps = {
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

export function CommandBar({
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
}: CommandBarProps) {
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

  const needsConnect =
    (realDemoFlow && !operationsConnected) || (!realDemoFlow && !sourcesConnected);
  const sourceSummaryMentionsConnect = sourceSummary?.toLowerCase().includes("connect") ?? false;
  const showConnectHelper =
    mounted && needsConnect && !sourceSummaryMentionsConnect;
  const showPullReadyHelper =
    mounted &&
    realDemoFlow &&
    operationsConnected &&
    batchCount === 0 &&
    !pullStatus &&
    !sourceSummary?.toLowerCase().includes("pull latest");

  return (
    <header
      className="ops-panel ops-strip"
      data-testid="command-bar"
    >
      <div
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5"
        data-testid="intake-context-bar"
        data-ready={mounted ? "true" : "false"}
      >
        <div className="flex min-w-0 items-center gap-x-3 text-sm">
          <span className="text-[0.95rem] font-semibold tracking-tight text-[#07111c]">
            Stadium Sentinel
          </span>
          <span className="hidden text-slate-300 lg:inline">|</span>
          <span className="hidden text-[0.8125rem] text-slate-600 lg:inline">Riverside Stadium</span>
          <span className="hidden text-slate-300 lg:inline">|</span>
          <span className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live operations
          </span>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {mounted && realDemoFlow && !operationsConnected ? (
            <button
              type="button"
              data-testid="connect-operations-data"
              disabled={connectLoading}
              onClick={onConnectOperations}
              className="rounded-md border border-emerald-500/40 bg-emerald-600 px-2.5 py-1 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45"
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
              className="rounded-md border border-blue-500/40 bg-blue-600 px-2.5 py-1 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {pullLoading ? "Pulling reports..." : "Pull latest reports"}
            </button>
          ) : null}
          {sentinelControl}
          {sourceSummary ? (
            <p
              className="max-w-[42ch] truncate text-[0.8125rem] text-slate-600"
              data-testid="command-strip-summary"
              title={sourceSummary}
            >
              {sourceSummary}
            </p>
          ) : null}
          {showConnectHelper ? (
            <p className="text-[0.75rem] text-slate-500" data-testid="pull-helper-text">
              Connect operations data first.
            </p>
          ) : null}
          {showPullReadyHelper ? (
            <p className="text-[0.75rem] text-slate-500" data-testid="pull-ready-helper-text">
              Pull latest reports to load incidents.
            </p>
          ) : null}
          {connectStatus ? (
            <p className="text-[0.75rem] text-slate-500" data-testid="connect-status">
              {connectStatus}
            </p>
          ) : null}
          {pullStatus ? (
            <p className="text-[0.75rem] text-slate-500" data-testid="pull-status">
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
    </header>
  );
}
