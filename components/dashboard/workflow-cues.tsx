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
    <article className="ops-subpanel p-5" data-testid="workflow-cues">
      <div className="mb-4">
        <h3 className="text-[1.05rem] font-semibold tracking-tight text-[#07111c]">
          Recommended dispatch message
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Staff-ready wording for radio or ops channel — copy only, nothing is sent.
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-3">
        <p
          className="min-w-0 flex-1 rounded-md border border-slate-200 bg-[var(--panel-inset)] px-4 py-3 font-mono text-sm leading-6 text-[#07111c]"
          data-testid="dispatch-message"
        >
          {dispatchMessage}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300"
          data-testid="copy-dispatch-message"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <p
        className="mt-3 border-t border-slate-200 pt-3 text-sm text-slate-500"
        data-testid="follow-up-sentinel-cue"
      >
        Staff follow-ups available in Ask Sentinel.
      </p>
    </article>
  );
}
