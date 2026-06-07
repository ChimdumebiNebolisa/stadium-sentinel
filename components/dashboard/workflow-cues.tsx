"use client";

import { useState } from "react";

import {
  buildDispatchMessage,
  buildFollowUpQuestions,
} from "@/lib/demo-agent-workflow";
import type { IncidentPackage } from "@/lib/types";

export function WorkflowCues({
  incidentPackage,
}: {
  incidentPackage: IncidentPackage;
}) {
  const [copied, setCopied] = useState(false);
  const dispatchMessage = buildDispatchMessage(incidentPackage);
  const followUpQuestions = buildFollowUpQuestions(incidentPackage);

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

      <div className="mt-5 border-t border-slate-200 pt-4">
        <h4 className="text-sm font-semibold text-[#07111c]">Follow-up questions</h4>
        <ul
          className="mt-2 space-y-2 text-sm text-slate-700"
          data-testid="follow-up-questions"
        >
          {followUpQuestions.map((question) => (
            <li key={question} className="flex gap-2">
              <span className="text-slate-400" aria-hidden="true">
                ?
              </span>
              <span>{question}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
