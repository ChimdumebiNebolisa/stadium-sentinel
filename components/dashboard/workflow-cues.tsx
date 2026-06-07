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
      className="rounded-md border border-slate-200 bg-[var(--panel-inset)] px-4 py-3"
      data-testid="workflow-cues"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="shrink-0 text-sm font-semibold text-[#07111c]">Dispatch note</span>
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
          className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300"
          data-testid="copy-dispatch-message"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p
        className="mt-2 text-xs text-slate-500"
        data-testid="follow-up-sentinel-cue"
      >
        Staff follow-ups available in Ask Sentinel.
      </p>
    </div>
  );
}
