"use client";

import { useEffect, useState } from "react";

import type { DemoStatusPayload } from "@/lib/demo-status";

type DemoStatusIndicatorProps = {
  className?: string;
};

function getDemoModeLabel(status: DemoStatusPayload): string {
  return status.mode === "elastic-backed" ? "Elastic-backed demo" : "Local fallback";
}

function getSentinelModeLabel(status: DemoStatusPayload): string {
  return status.sentinelMode === "vertex-backed"
    ? "Vertex-backed Sentinel"
    : "Deterministic fallback";
}

export function DemoStatusIndicator({ className = "" }: DemoStatusIndicatorProps) {
  const [status, setStatus] = useState<DemoStatusPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/demo/status", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled && payload) {
          setStatus(payload as DemoStatusPayload);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!status) {
    return null;
  }

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-1.5 text-[0.72rem] ${className}`}
      data-testid="demo-status-indicator"
      title={`Real demo flow: ${status.realDemoFlow ? "on" : "off"}; voice: ${
        status.voiceEnabled ? "on" : "off"
      }`}
    >
      <span
        className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-700"
        data-testid="demo-mode-status"
      >
        {getDemoModeLabel(status)}
      </span>
      <span
        className="rounded-full border border-violet-500/20 bg-violet-500/5 px-2 py-0.5 font-semibold text-violet-900"
        data-testid="sentinel-mode-status"
      >
        {getSentinelModeLabel(status)}
      </span>
    </div>
  );
}
