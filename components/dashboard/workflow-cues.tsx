"use client";

import { useState } from "react";

import { buildDispatchMessage } from "@/lib/demo-agent-workflow";
import type { IncidentPackage } from "@/lib/types";

export function WorkflowCues({
  incidentPackage,
}: {
  incidentPackage: IncidentPackage;
}) {
  const [copied, setCopied] = useState(false);
  const dispatchMessage = buildDispatchMessage(incidentPackage);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(dispatchMessage);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="rounded-md border border-slate-200 bg-[var(--panel-inset)] px-3 py-2"
      data-testid="workflow-cues"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.04em] text-slate-600">
          Dispatch note
        </span>
        <p
          className="min-w-0 flex-1 truncate text-sm text-slate-700"
          data-testid="dispatch-message"
          title={dispatchMessage}
        >
          {dispatchMessage}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300"
          data-testid="copy-dispatch-message"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-1 text-[0.7rem] text-slate-500" data-testid="follow-up-sentinel-cue">
        More follow-ups in Ask Sentinel.
      </p>
    </div>
  );
}
